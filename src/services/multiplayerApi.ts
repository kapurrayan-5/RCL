import Peer, { DataConnection } from 'peerjs';
import { FormationType, Player, TeamTactics } from '../types/game';
import { LeaderboardEntry, MultiplayerMode, MultiplayerRoom, RoomMember } from '../types/multiplayer';
import { ALL_CLUBS, getRandomClub } from '../data/clubs';
import { FORMATIONS } from '../utils/formation';

// Cross-tab broadcast channel for instant same-browser multi-tab sync
const mpChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('rcl_multiplayer_bus')
  : null;

export function normalizeRoomCode(rawCode: string): string {
  let clean = (rawCode || '').trim().toUpperCase();
  if (clean.includes('ROOM=')) {
    const match = clean.match(/ROOM=([A-Z0-9-]+)/i);
    if (match && match[1]) {
      clean = match[1].trim().toUpperCase();
    }
  }
  clean = clean.replace(/^[#?]/, '').trim();
  if (/^\d{3,4}$/.test(clean)) {
    clean = `RCL-${clean}`;
  }
  return clean;
}

// Per-tab persistent session management (uses sessionStorage so opening a 2nd tab never hijacks Host's ID)
export function saveLocalSession(roomCode: string, memberId: string) {
  try {
    if (typeof window === 'undefined') return;
    const clean = normalizeRoomCode(roomCode);
    sessionStorage.setItem('rcl_active_room_code', clean);
    sessionStorage.setItem('rcl_active_member_id', memberId);
    // Clean any legacy cross-tab localStorage session keys
    localStorage.removeItem('rcl_active_room_code');
    localStorage.removeItem('rcl_active_member_id');
  } catch {
    // ignore
  }
}

export function getLocalSession(): { roomCode: string | null; memberId: string | null } {
  try {
    if (typeof window === 'undefined') return { roomCode: null, memberId: null };
    const roomCode = sessionStorage.getItem('rcl_active_room_code');
    const memberId = sessionStorage.getItem('rcl_active_member_id');
    return { roomCode, memberId };
  } catch {
    return { roomCode: null, memberId: null };
  }
}

export function clearLocalSession() {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('rcl_active_room_code');
    sessionStorage.removeItem('rcl_active_member_id');
    localStorage.removeItem('rcl_active_room_code');
    localStorage.removeItem('rcl_active_member_id');
    localStorage.removeItem('rcl_last_active_room');
  } catch {
    // ignore
  }
}

// Backend availability detection (true on AI Studio / Node full-stack, false on static-only hosts like Vercel)
let backendAvailableCache: boolean | null = null;
let backendCheckedAt = 0;

async function isBackendAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  if (backendAvailableCache !== null && Date.now() - backendCheckedAt < 15000) {
    return backendAvailableCache;
  }
  try {
    const res = await fetch(`/api/health?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      backendAvailableCache = Boolean(data?.ok);
      backendCheckedAt = Date.now();
      return backendAvailableCache;
    }
  } catch {
    // static or offline
  }
  backendAvailableCache = false;
  backendCheckedAt = Date.now();
  return false;
}

// Local room storage helpers (for static/offline fallback)
export function getLocalRoom(code: string): MultiplayerRoom | null {
  try {
    if (typeof window === 'undefined') return null;
    const clean = normalizeRoomCode(code);
    const raw = localStorage.getItem(`rcl_room_${clean}`);
    if (raw) return JSON.parse(raw);

    const stripped = clean.replace(/[^A-Z0-9]/g, '');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('rcl_room_')) {
        const itemCode = key.replace('rcl_room_', '').replace(/[^A-Z0-9]/g, '');
        if (itemCode === stripped || (stripped.length >= 3 && itemCode.endsWith(stripped))) {
          const itemVal = localStorage.getItem(key);
          if (itemVal) return JSON.parse(itemVal);
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocalRoom(room: MultiplayerRoom, broadcastLocally = true) {
  try {
    if (typeof window === 'undefined') return;
    const code = normalizeRoomCode(room.code);
    localStorage.setItem(`rcl_room_${code}`, JSON.stringify(room));
    if (broadcastLocally && mpChannel) {
      mpChannel.postMessage({ type: 'ROOM_UPDATE', room });
    }
  } catch {
    // ignore
  }
}

export function deleteLocalRoom(code: string) {
  try {
    if (typeof window === 'undefined') return;
    const clean = normalizeRoomCode(code);
    localStorage.removeItem(`rcl_room_${clean}`);
    if (mpChannel) {
      mpChannel.postMessage({ type: 'ROOM_CLOSED', code: clean });
    }
  } catch {
    // ignore
  }
}

// Helper: auto-start draft when required players are connected and all are ready
function maybeAutoStartDraftLocal(room: MultiplayerRoom): boolean {
  if (room.status !== 'LOBBY') return false;
  const requiredCount = room.mode === '1v1' ? 2 : room.mode === 'TOURNAMENT_4' ? 4 : 8;
  if (room.members.length >= requiredCount && room.members.every(m => m.ready)) {
    room.status = 'DRAFT';
    room.currentTurnMemberId = room.members[0].id;
    room.turnIndex = 0;
    room.claimedPlayerIds = [];
    room.activeSquadId = getRandomClub().id;
    room.updatedAt = Date.now();
    return true;
  }
  return false;
}

// ============================================================================
// PeerJS Host-Authoritative Mesh (ONLY used when static host has no /api)
// ============================================================================
let activeHostPeer: Peer | null = null;
let activeHostRoomCode: string | null = null;
const activeHostConns = new Set<DataConnection>();

let activeClientPeer: Peer | null = null;
let activeClientConn: DataConnection | null = null;
let activeClientRoomCode: string | null = null;
const peerUpdateListeners = new Set<(room: MultiplayerRoom) => void>();
const peerCloseListeners = new Set<(code: string) => void>();

function peerIdForRoom(code: string): string {
  const clean = normalizeRoomCode(code).replace(/[^A-Z0-9]/g, '');
  return `rcl-room-v3-${clean}`;
}

function broadcastToPeerClients(room: MultiplayerRoom) {
  const msg = { type: 'ROOM_UPDATE', room };
  activeHostConns.forEach(conn => {
    if (conn.open) {
      try {
        conn.send(msg);
      } catch {
        // ignore
      }
    }
  });
}

function applyRoomMutationLocal(room: MultiplayerRoom, action: any): { room: MultiplayerRoom | null; closed?: boolean; memberId?: string; error?: string } {
  if (action.type === 'JOIN') {
    const cleanName = (action.memberName && action.memberName.trim()) ? action.memberName.trim() : 'Challenger';
    if (action.memberId) {
      const existingById = room.members.find(m => m.id === action.memberId);
      if (existingById) {
        return { room, memberId: existingById.id };
      }
    }
    const existingByName = room.members.find(m => m.name.toLowerCase() === cleanName.toLowerCase() && !m.isHost);
    if (existingByName) {
      return { room, memberId: existingByName.id };
    }
    const maxCap = room.mode === '1v1' ? 2 : room.mode === 'TOURNAMENT_4' ? 4 : 8;
    if (room.members.length >= maxCap) {
      return { room, error: 'This room is already at full capacity.' };
    }
    if (room.status !== 'LOBBY') {
      return { room, error: 'The match or draft has already started in this room.' };
    }

    let finalName = cleanName;
    if (room.members.some(m => m.name.toLowerCase() === finalName.toLowerCase())) {
      let c = 2;
      while (room.members.some(m => m.name.toLowerCase() === `${finalName} (${c})`.toLowerCase())) c++;
      finalName = `${finalName} (${c})`;
    }

    const memberId = `usr-${Math.random().toString(36).substring(2, 9)}`;
    const newMember: RoomMember = {
      id: memberId,
      name: finalName,
      clubName: action.clubName || 'Challenger XI',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      isHost: false,
      ready: false,
      formation: '4-3-3',
      tactics: {
        buildup: 'Direct',
        mentality: 'Balanced',
        defensiveLine: 'Medium',
        pressing: 'Medium',
        passing: 'Mixed',
        width: 'Balanced',
      },
      startingXI: {},
      analytics: {
        overallRating: 0,
        scoringRating: 0,
        stoppingRating: 0,
        teamworkRating: 0,
        formationCompatibility: 80,
        cardScore: 0,
        positionCoverage: 0,
        squadDepth: 0,
      },
      rerollsLeft: 3,
      draftPicksCount: 0,
      matchScore: 0,
    };
    FORMATIONS['4-3-3'].slots.forEach(s => { newMember.startingXI[s.id] = null; });
    room.members.push(newMember);
    room.updatedAt = Date.now();
    return { room, memberId };
  }

  if (action.type === 'TOGGLE_READY') {
    const m = room.members.find(x => x.id === action.memberId);
    if (!m) return { room, error: 'Member not found' };
    m.ready = action.ready !== undefined ? action.ready : !m.ready;
    room.updatedAt = Date.now();
    maybeAutoStartDraftLocal(room);
    return { room };
  }

  if (action.type === 'START_DRAFT') {
    if (room.hostId !== action.memberId) return { room, error: 'Only host can start draft' };
    room.status = 'DRAFT';
    room.currentTurnMemberId = room.members[0].id;
    room.turnIndex = 0;
    room.claimedPlayerIds = [];
    room.activeSquadId = getRandomClub().id;
    room.updatedAt = Date.now();
    return { room };
  }

  if (action.type === 'DRAFT_PICK') {
    if (room.status !== 'DRAFT') return { room, error: 'Room is not drafting' };
    if (room.claimedPlayerIds.includes(action.playerId)) return { room, error: 'Player already claimed' };
    const member = room.members.find(m => m.id === action.memberId);
    if (!member) return { room, error: 'Member not found' };
    const club = ALL_CLUBS.find(c => c.id === room.activeSquadId) || ALL_CLUBS[0];
    const player = club.roster.find(p => p.id === action.playerId) || ALL_CLUBS.flatMap(c => c.roster).find(p => p.id === action.playerId);
    if (!player) return { room, error: 'Player not found' };

    member.startingXI[action.slotId] = player;
    member.draftPicksCount = Object.values(member.startingXI).filter(Boolean).length;
    room.claimedPlayerIds.push(player.id);
    const players = Object.values(member.startingXI).filter((p): p is Player => p !== null);
    member.analytics.overallRating = players.length > 0 ? Math.round(players.reduce((a, b) => a + b.overall, 0) / players.length) : 60;

    const currentIdx = room.members.findIndex(m => m.id === action.memberId);
    const nextIdx = (currentIdx + 1) % room.members.length;
    room.currentTurnMemberId = room.members[nextIdx].id;
    room.turnIndex += 1;
    room.activeSquadId = getRandomClub([room.activeSquadId]).id;

    if (room.members.every(m => Object.values(m.startingXI).filter(Boolean).length >= 11)) {
      room.status = 'READY_BATTLE';
    }
    room.updatedAt = Date.now();
    return { room };
  }

  if (action.type === 'REROLL') {
    const member = room.members.find(m => m.id === action.memberId);
    if (!member || member.rerollsLeft <= 0) return { room, error: 'No rerolls left' };
    member.rerollsLeft -= 1;
    room.activeSquadId = getRandomClub([room.activeSquadId]).id;
    room.updatedAt = Date.now();
    return { room };
  }

  if (action.type === 'UPDATE_TACTICS') {
    const member = room.members.find(m => m.id === action.memberId);
    if (member) {
      if (action.formation) member.formation = action.formation;
      if (action.tactics) member.tactics = { ...member.tactics, ...action.tactics };
      room.updatedAt = Date.now();
    }
    return { room };
  }

  if (action.type === 'LAUNCH_MATCH') {
    const home = room.members[0];
    const away = room.members[1] || room.members[0];
    room.status = 'MATCH';
    room.h2hMatch = {
      matchId: `m-${Date.now()}`,
      homeMemberId: home.id,
      awayMemberId: away.id,
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      isFinished: false,
      events: [{
        id: 'ev-0',
        minute: 1,
        type: 'CHANCE',
        team: 'home',
        playerName: 'Referee',
        description: 'Whistle blows! 1v1 battle kicks off.',
        scoreline: '0 - 0',
      }],
      stats: { possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], tackles: [0, 0] },
      winnerId: null,
    };
    room.updatedAt = Date.now();
    return { room };
  }

  if (action.type === 'LEAVE') {
    room.members = room.members.filter(m => m.id !== action.memberId);
    const humans = room.members.filter(m => !m.isBot);
    if (room.members.length === 0 || humans.length === 0) {
      return { room: null, closed: true };
    }
    if (room.hostId === action.memberId || !room.members.some(m => m.id === room.hostId)) {
      const nextHost = humans[0] || room.members[0];
      room.hostId = nextHost.id;
      room.members.forEach(m => { m.isHost = m.id === nextHost.id; });
    }
    if (room.currentTurnMemberId === action.memberId) {
      room.currentTurnMemberId = room.members[0].id;
    }
    if (room.status === 'DRAFT' && room.members.length < 2) {
      room.status = 'LOBBY';
    }
    room.updatedAt = Date.now();
    return { room };
  }

  return { room };
}

function startStaticHostPeer(roomCode: string) {
  if (typeof window === 'undefined') return;
  const norm = normalizeRoomCode(roomCode);
  if (activeHostPeer && activeHostRoomCode === norm && !activeHostPeer.destroyed) return;

  cleanupStaticPeers();
  activeHostRoomCode = norm;
  const peer = new Peer(peerIdForRoom(norm), { debug: 0 });
  activeHostPeer = peer;

  peer.on('connection', (conn) => {
    activeHostConns.add(conn);
    conn.on('open', () => {
      const latest = getLocalRoom(norm);
      if (latest) conn.send({ type: 'ROOM_UPDATE', room: latest });
    });

    conn.on('data', (raw: any) => {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const current = getLocalRoom(norm);
        if (!current) {
          conn.send({ type: 'ACTION_ERROR', reqId: msg.reqId, error: 'Room closed' });
          return;
        }
        const res = applyRoomMutationLocal(current, msg);
        if (res.error) {
          conn.send({ type: 'ACTION_ERROR', reqId: msg.reqId, error: res.error });
          return;
        }
        if (res.closed || !res.room) {
          deleteLocalRoom(norm);
          activeHostConns.forEach(c => c.open && c.send({ type: 'ROOM_CLOSED', code: norm }));
          cleanupStaticPeers();
          return;
        }
        saveLocalRoom(res.room);
        broadcastToPeerClients(res.room);
        peerUpdateListeners.forEach(cb => cb(res.room!));
        conn.send({
          type: 'ACTION_OK',
          reqId: msg.reqId,
          room: res.room,
          currentMemberId: res.memberId,
        });
      } catch {
        // ignore
      }
    });

    conn.on('close', () => {
      activeHostConns.delete(conn);
    });
  });
}

function cleanupStaticPeers() {
  activeHostConns.forEach(c => { try { c.close(); } catch {} });
  activeHostConns.clear();
  if (activeHostPeer) { try { activeHostPeer.destroy(); } catch {} activeHostPeer = null; }
  activeHostRoomCode = null;
  if (activeClientConn) { try { activeClientConn.close(); } catch {} activeClientConn = null; }
  if (activeClientPeer) { try { activeClientPeer.destroy(); } catch {} activeClientPeer = null; }
  activeClientRoomCode = null;
}

async function sendPeerActionToHost(code: string, payload: any): Promise<{ room: MultiplayerRoom; currentMemberId?: string }> {
  const norm = normalizeRoomCode(code);
  const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const ensureClientConn = async (): Promise<DataConnection> => {
    if (activeClientConn && activeClientConn.open && activeClientRoomCode === norm) {
      return activeClientConn;
    }
    cleanupStaticPeers();
    activeClientRoomCode = norm;
    return new Promise((resolve, reject) => {
      const peer = new Peer({ debug: 0 });
      activeClientPeer = peer;
      const timer = setTimeout(() => {
        reject(new Error(`Room "${norm}" not found or host is offline.`));
      }, 7000);

      peer.on('open', () => {
        const conn = peer.connect(peerIdForRoom(norm), { reliable: true });
        activeClientConn = conn;
        conn.on('open', () => {
          clearTimeout(timer);
          resolve(conn);
        });
        conn.on('data', (raw: any) => {
          try {
            const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (msg.type === 'ROOM_UPDATE' && msg.room) {
              saveLocalRoom(msg.room);
              peerUpdateListeners.forEach(cb => cb(msg.room));
            } else if (msg.type === 'ROOM_CLOSED') {
              deleteLocalRoom(norm);
              peerCloseListeners.forEach(cb => cb(norm));
            }
          } catch {}
        });
        conn.on('error', () => {
          clearTimeout(timer);
          reject(new Error(`Unable to connect to room "${norm}".`));
        });
      });

      peer.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(err?.message?.includes('Could not connect') ? `Room "${norm}" not found.` : (err?.message || 'Connection failed')));
      });
    });
  };

  const conn = await ensureClientConn();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host did not respond in time.')), 6000);
    const handler = (raw: any) => {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (msg.reqId === reqId) {
          clearTimeout(timer);
          conn.off('data', handler);
          if (msg.type === 'ACTION_ERROR') {
            reject(new Error(msg.error || 'Action failed'));
          } else {
            if (msg.room) saveLocalRoom(msg.room);
            resolve({ room: msg.room, currentMemberId: msg.currentMemberId });
          }
        }
      } catch {}
    };
    conn.on('data', handler);
    conn.send({ ...payload, reqId });
  });
}

// ============================================================================
// Public Multiplayer API
// ============================================================================
export async function createRoomApi(
  hostName: string,
  clubName: string,
  mode: MultiplayerMode,
  customCode?: string
): Promise<{ room: MultiplayerRoom; currentMemberId: string }> {
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, clubName, mode, customCode }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create room');
      }
      saveLocalRoom(data.room);
      saveLocalSession(data.room.code, data.currentMemberId);
      return data;
    }
  }

  // Static / serverless fallback (Vercel)
  let code = (customCode && customCode.trim()
    ? normalizeRoomCode(customCode).replace(/[^A-Z0-9-]/g, '').slice(0, 12)
    : `RCL-${Math.floor(100 + Math.random() * 900)}`);
  if (!code) code = `RCL-${Math.floor(100 + Math.random() * 900)}`;

  const hostId = `usr-${Math.random().toString(36).substring(2, 9)}`;
  const initialClub = getRandomClub();

  const hostMember: RoomMember = {
    id: hostId,
    name: (hostName && hostName.trim()) ? hostName.trim() : 'Host Manager',
    clubName: (clubName && clubName.trim()) ? clubName.trim() : 'RCL Dream XI',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    isHost: true,
    ready: false,
    formation: '4-3-3',
    tactics: {
      buildup: 'Direct',
      mentality: 'Balanced',
      defensiveLine: 'Medium',
      pressing: 'Medium',
      passing: 'Mixed',
      width: 'Balanced',
    },
    startingXI: {},
    analytics: {
      overallRating: 0,
      scoringRating: 0,
      stoppingRating: 0,
      teamworkRating: 0,
      formationCompatibility: 80,
      cardScore: 0,
      positionCoverage: 0,
      squadDepth: 0,
    },
    rerollsLeft: 3,
    draftPicksCount: 0,
    matchScore: 0,
  };
  FORMATIONS['4-3-3'].slots.forEach(s => { hostMember.startingXI[s.id] = null; });

  const room: MultiplayerRoom = {
    code,
    name: `${hostMember.name}'s Room`,
    mode: mode || '1v1',
    status: 'LOBBY',
    hostId,
    members: [hostMember],
    currentTurnMemberId: hostId,
    turnIndex: 0,
    claimedPlayerIds: [],
    activeSquadId: initialClub.id,
    h2hMatch: null,
    bracket: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveLocalRoom(room);
  saveLocalSession(room.code, hostId);
  startStaticHostPeer(room.code);
  return { room, currentMemberId: hostId };
}

export async function joinRoomApi(
  code: string,
  memberName: string,
  clubName: string
): Promise<{ room: MultiplayerRoom; currentMemberId: string }> {
  const roomCode = normalizeRoomCode(code);
  if (!roomCode) {
    throw new Error('Please enter a valid room code.');
  }

  const session = getLocalSession();
  const existingMemberId = session.memberId && session.roomCode === roomCode ? session.memberId : undefined;

  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: roomCode,
        memberName,
        clubName,
        memberId: existingMemberId,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Room "${roomCode}" not found.`);
      }
      saveLocalRoom(data.room);
      saveLocalSession(data.room.code, data.currentMemberId);
      return data;
    }
  }

  // Static fallback: check same-browser localStorage first, then PeerJS cross-device
  const localRoom = getLocalRoom(roomCode);
  if (localRoom) {
    const res = applyRoomMutationLocal(localRoom, {
      type: 'JOIN',
      memberName,
      clubName,
      memberId: existingMemberId,
    });
    if (res.error) throw new Error(res.error);
    saveLocalRoom(res.room!);
    saveLocalSession(res.room!.code, res.memberId!);
    return { room: res.room!, currentMemberId: res.memberId! };
  }

  const remote = await sendPeerActionToHost(roomCode, {
    type: 'JOIN',
    memberName,
    clubName,
    memberId: existingMemberId,
  });
  saveLocalSession(remote.room.code, remote.currentMemberId!);
  return { room: remote.room, currentMemberId: remote.currentMemberId! };
}

export async function leaveRoomApi(code: string, memberId?: string | null): Promise<void> {
  const roomCode = normalizeRoomCode(code);
  clearLocalSession();

  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    try {
      await fetch('/api/rooms/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, memberId }),
      });
    } catch {
      // ignore network error on leave
    }
    deleteLocalRoom(roomCode);
    cleanupStaticPeers();
    return;
  }

  const localRoom = getLocalRoom(roomCode);
  if (localRoom && activeHostRoomCode === roomCode) {
    const res = applyRoomMutationLocal(localRoom, { type: 'LEAVE', memberId });
    if (res.closed || !res.room) {
      deleteLocalRoom(roomCode);
      activeHostConns.forEach(c => c.open && c.send({ type: 'ROOM_CLOSED', code: roomCode }));
    } else {
      saveLocalRoom(res.room);
      broadcastToPeerClients(res.room);
    }
  } else if (activeClientConn && activeClientConn.open) {
    try {
      await sendPeerActionToHost(roomCode, { type: 'LEAVE', memberId });
    } catch {
      // ignore
    }
  } else if (localRoom) {
    const res = applyRoomMutationLocal(localRoom, { type: 'LEAVE', memberId });
    if (res.closed || !res.room) deleteLocalRoom(roomCode);
    else saveLocalRoom(res.room);
  }

  cleanupStaticPeers();
}

export async function addBotApi(code: string): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/add-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to add challenger');
    saveLocalRoom(data.room);
    return data.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const maxCapacity = local.mode === '1v1' ? 2 : local.mode === 'TOURNAMENT_4' ? 4 : 8;
  if (local.members.length >= maxCapacity) throw new Error('Room is already full');

  const BOT_MANAGERS = [
    { name: 'Pep Guardiola', club: 'Barça 2011' },
    { name: 'Sir Alex Ferguson', club: 'Man United 2008' },
    { name: 'Carlo Ancelotti', club: 'Real Madrid 2017' },
    { name: 'José Mourinho', club: 'Chelsea 2005' },
    { name: 'Claudio Ranieri', club: 'Leicester 2016' },
  ];
  const botInfo = BOT_MANAGERS[Math.floor(Math.random() * BOT_MANAGERS.length)];
  const botMember: RoomMember = {
    id: `bot-${Math.random().toString(36).substring(2, 9)}`,
    name: `${botInfo.name} (AI)`,
    clubName: botInfo.club,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
    isHost: false,
    ready: true,
    formation: '4-3-3',
    tactics: { buildup: 'Direct', mentality: 'Attacking', defensiveLine: 'High', pressing: 'High', passing: 'Mixed', width: 'Wide' },
    startingXI: {},
    analytics: { overallRating: 84, scoringRating: 82, stoppingRating: 80, teamworkRating: 85, formationCompatibility: 85, cardScore: 84, positionCoverage: 80, squadDepth: 75 },
    rerollsLeft: 3,
    draftPicksCount: 0,
    matchScore: 0,
    isBot: true,
  };
  FORMATIONS['4-3-3'].slots.forEach(s => { botMember.startingXI[s.id] = null; });
  local.members.push(botMember);
  local.updatedAt = Date.now();
  maybeAutoStartDraftLocal(local);
  saveLocalRoom(local);
  broadcastToPeerClients(local);
  return local;
}

export async function getRoomApi(code: string): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Room "${roomCode}" not found.`);
      }
      saveLocalRoom(data.room, false);
      return data.room;
    }
  }

  const local = getLocalRoom(roomCode);
  if (local) return local;
  throw new Error(`Room "${roomCode}" not found. Verify the code with the host.`);
}

export async function startDraftApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/start-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to start draft');
    saveLocalRoom(data.room);
    return data.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const res = applyRoomMutationLocal(local, { type: 'START_DRAFT', memberId });
  if (res.error) throw new Error(res.error);
  saveLocalRoom(res.room!);
  broadcastToPeerClients(res.room!);
  return res.room!;
}

export async function draftPickApi(
  code: string,
  memberId: string,
  playerId: string,
  slotId: string
): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/draft-pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId, playerId, slotId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Draft pick failed');
    saveLocalRoom(data.room);
    return data.room;
  }

  if (activeClientConn && activeClientConn.open && activeClientRoomCode === roomCode) {
    const remote = await sendPeerActionToHost(roomCode, { type: 'DRAFT_PICK', memberId, playerId, slotId });
    return remote.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const res = applyRoomMutationLocal(local, { type: 'DRAFT_PICK', memberId, playerId, slotId });
  if (res.error) throw new Error(res.error);
  saveLocalRoom(res.room!);
  broadcastToPeerClients(res.room!);

  const nextMem = res.room!.members.find(m => m.id === res.room!.currentTurnMemberId);
  if (nextMem && nextMem.isBot && res.room!.status === 'DRAFT') {
    setTimeout(() => {
      const latest = getLocalRoom(roomCode);
      if (!latest || latest.status !== 'DRAFT') return;
      const bot = latest.members.find(m => m.id === latest.currentTurnMemberId && m.isBot);
      if (!bot) return;
      const currentSquad = ALL_CLUBS.find(c => c.id === latest.activeSquadId) || ALL_CLUBS[0];
      const emptySlot = Object.entries(bot.startingXI).find(([, p]) => p === null);
      const candidate = currentSquad.roster.find(p => !latest.claimedPlayerIds.includes(p.id));
      if (emptySlot && candidate) {
        const botRes = applyRoomMutationLocal(latest, { type: 'DRAFT_PICK', memberId: bot.id, playerId: candidate.id, slotId: emptySlot[0] });
        if (botRes.room) {
          saveLocalRoom(botRes.room);
          broadcastToPeerClients(botRes.room);
          peerUpdateListeners.forEach(cb => cb(botRes.room!));
        }
      }
    }, 500);
  }

  return res.room!;
}

export async function rerollSquadApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/reroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Reroll failed');
    saveLocalRoom(data.room);
    return data.room;
  }

  if (activeClientConn && activeClientConn.open && activeClientRoomCode === roomCode) {
    const remote = await sendPeerActionToHost(roomCode, { type: 'REROLL', memberId });
    return remote.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const res = applyRoomMutationLocal(local, { type: 'REROLL', memberId });
  if (res.error) throw new Error(res.error);
  saveLocalRoom(res.room!);
  broadcastToPeerClients(res.room!);
  return res.room!;
}

export async function updateTacticsApi(
  code: string,
  memberId: string,
  formation?: FormationType,
  tactics?: Partial<TeamTactics>
): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/update-tactics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId, formation, tactics }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to update tactics');
    saveLocalRoom(data.room);
    return data.room;
  }

  if (activeClientConn && activeClientConn.open && activeClientRoomCode === roomCode) {
    const remote = await sendPeerActionToHost(roomCode, { type: 'UPDATE_TACTICS', memberId, formation, tactics });
    return remote.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const res = applyRoomMutationLocal(local, { type: 'UPDATE_TACTICS', memberId, formation, tactics });
  saveLocalRoom(res.room!);
  broadcastToPeerClients(res.room!);
  return res.room!;
}

export async function toggleReadyApi(code: string, memberId: string, ready?: boolean): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId, ready }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to toggle ready');
    saveLocalRoom(data.room);
    return data.room;
  }

  if (activeClientConn && activeClientConn.open && activeClientRoomCode === roomCode) {
    const remote = await sendPeerActionToHost(roomCode, { type: 'TOGGLE_READY', memberId, ready });
    return remote.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const res = applyRoomMutationLocal(local, { type: 'TOGGLE_READY', memberId, ready });
  if (res.error) throw new Error(res.error);
  saveLocalRoom(res.room!);
  broadcastToPeerClients(res.room!);
  return res.room!;
}

export async function launchMatchApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/launch-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to launch match');
    saveLocalRoom(data.room);
    return data.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const res = applyRoomMutationLocal(local, { type: 'LAUNCH_MATCH', memberId });
  saveLocalRoom(res.room!);
  broadcastToPeerClients(res.room!);
  return res.room!;
}

export async function stepMatchApi(code: string): Promise<MultiplayerRoom> {
  const roomCode = normalizeRoomCode(code);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    const res = await fetch('/api/rooms/step-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed to advance match');
    saveLocalRoom(data.room);
    return data.room;
  }

  const local = getLocalRoom(roomCode);
  if (!local || !local.h2hMatch) throw new Error('Match not active');
  const match = local.h2hMatch;
  match.minute = Math.min(90, match.minute + Math.floor(Math.random() * 6 + 6));

  const home = local.members.find(m => m.id === match.homeMemberId)!;
  const away = local.members.find(m => m.id === match.awayMemberId)!;
  const homePlayers = Object.values(home.startingXI).filter((p): p is Player => p !== null);
  const awayPlayers = Object.values(away.startingXI).filter((p): p is Player => p !== null);

  const roll = Math.random();
  if (roll < 0.25) {
    const isHome = Math.random() > 0.45;
    const team = isHome ? 'home' : 'away';
    if (isHome) match.homeScore += 1;
    else match.awayScore += 1;
    const pool = isHome ? homePlayers : awayPlayers;
    const scorer = pool[Math.floor(Math.random() * pool.length)] || { shortName: 'Striker' };
    match.events.unshift({
      id: `ev-${Date.now()}`,
      minute: match.minute,
      type: 'GOAL',
      team,
      playerName: scorer.shortName,
      description: `GOAL! ${scorer.shortName} scores an emphatic finish!`,
      scoreline: `${match.homeScore} - ${match.awayScore}`,
    });
  }

  if (match.minute >= 90) {
    match.isFinished = true;
    local.status = 'COMPLETED';
    match.winnerId = match.homeScore >= match.awayScore ? home.id : away.id;
  }

  local.updatedAt = Date.now();
  saveLocalRoom(local);
  broadcastToPeerClients(local);
  return local;
}

export async function getLeaderboardApi(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.leaderboard)) {
        localStorage.setItem('rcl_leaderboard', JSON.stringify(data.leaderboard));
        return data.leaderboard;
      }
    }
  } catch {
    // fallback
  }

  try {
    const local = localStorage.getItem('rcl_leaderboard');
    if (local) return JSON.parse(local);
  } catch {}

  return [];
}

export async function submitLeaderboardApi(entry: {
  managerName: string;
  clubName: string;
  wins: number;
  draws: number;
  losses: number;
  trophiesWon: number;
  highestScore: number;
  totalGoals: number;
}): Promise<boolean> {
  try {
    const raw = localStorage.getItem('rcl_leaderboard');
    const list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    const existingIndex = list.findIndex(e => e.managerName.toLowerCase() === entry.managerName.toLowerCase());
    const totalMatches = entry.wins + entry.draws + entry.losses;
    const winRate = totalMatches > 0 ? Math.round((entry.wins / totalMatches) * 100) : 0;
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        clubName: entry.clubName,
        wins: Math.max(list[existingIndex].wins, entry.wins),
        draws: Math.max(list[existingIndex].draws, entry.draws),
        losses: Math.max(list[existingIndex].losses, entry.losses),
        trophiesWon: Math.max(list[existingIndex].trophiesWon, entry.trophiesWon),
        highestScore: Math.max(list[existingIndex].highestScore, entry.highestScore),
        totalGoals: Math.max(list[existingIndex].totalGoals, entry.totalGoals),
        winRate: Math.max(list[existingIndex].winRate, winRate),
      };
    } else {
      list.push({
        id: `usr-${Date.now()}`,
        managerName: entry.managerName,
        clubName: entry.clubName,
        wins: entry.wins,
        draws: entry.draws,
        losses: entry.losses,
        trophiesWon: entry.trophiesWon,
        highestScore: entry.highestScore,
        totalGoals: entry.totalGoals,
        winRate,
        isCurrentUser: true,
      });
    }
    localStorage.setItem('rcl_leaderboard', JSON.stringify(list));
  } catch {}

  try {
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Real-Time Room Subscription (WebSocket /ws + Polling Fallback + BroadcastChannel + PeerJS)
export function subscribeToRoomSocket(
  code: string,
  memberId: string,
  onUpdate: (room: MultiplayerRoom) => void,
  onRoomClosed?: () => void
): () => void {
  const roomCode = normalizeRoomCode(code);
  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;
  let pollInterval: any = null;
  let lastUpdatedAt = 0;

  const emitUpdate = (room: MultiplayerRoom) => {
    if (isClosed) return;
    if (room.updatedAt && room.updatedAt === lastUpdatedAt) return;
    lastUpdatedAt = room.updatedAt || Date.now();
    onUpdate(room);
  };

  // Ensure static Host Peer is running if backend is unavailable
  isBackendAvailable().then(hasBackend => {
    if (!hasBackend && !isClosed) {
      const local = getLocalRoom(roomCode);
      if (local && local.hostId === memberId) {
        startStaticHostPeer(roomCode);
      }
    }
  });

  // 1. Immediately fetch fresh room state
  getRoomApi(roomCode).then(emitUpdate).catch(() => {});

  // 2. PeerJS update listeners (static host fallback)
  const handlePeerUpdate = (room: MultiplayerRoom) => {
    const incCode = normalizeRoomCode(room.code).replace(/[^A-Z0-9]/g, '');
    const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
    if (incCode === curCode) emitUpdate(room);
  };
  const handlePeerClose = (closedCode: string) => {
    const incCode = normalizeRoomCode(closedCode).replace(/[^A-Z0-9]/g, '');
    const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
    if (incCode === curCode && !isClosed) onRoomClosed?.();
  };
  peerUpdateListeners.add(handlePeerUpdate);
  peerCloseListeners.add(handlePeerClose);

  // 3. Cross-tab Broadcast Channel listener
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data?.type === 'ROOM_UPDATE' && event.data?.room) {
      const incCode = normalizeRoomCode(event.data.room.code).replace(/[^A-Z0-9]/g, '');
      const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
      if (incCode === curCode) emitUpdate(event.data.room);
    } else if (event.data?.type === 'ROOM_CLOSED' && event.data?.code) {
      const incCode = normalizeRoomCode(event.data.code).replace(/[^A-Z0-9]/g, '');
      const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
      if (incCode === curCode && !isClosed) onRoomClosed?.();
    }
  };
  mpChannel?.addEventListener('message', handleBcMessage);

  // 4. Storage event listener (across browser tabs)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && e.key.startsWith('rcl_room_') && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        const incCode = normalizeRoomCode(parsed.code || '').replace(/[^A-Z0-9]/g, '');
        const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
        if (incCode === curCode) emitUpdate(parsed);
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 5. Polling fallback every 800ms when backend is active
  pollInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      const hasBackend = await isBackendAvailable();
      if (!hasBackend) return;
      const room = await getRoomApi(roomCode);
      if (room && !isClosed) emitUpdate(room);
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('not found') && !isClosed) {
        onRoomClosed?.();
      }
    }
  }, 800);

  // 6. WebSocket connection using explicit /ws path
  function connect() {
    if (isClosed) return;
    isBackendAvailable().then(hasBackend => {
      if (!hasBackend || isClosed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: 'SUBSCRIBE_ROOM', roomCode, memberId }));
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ROOM_UPDATE' && payload.room) {
              saveLocalRoom(payload.room, false);
              emitUpdate(payload.room);
            } else if (payload.type === 'ROOM_CLOSED' && !isClosed) {
              onRoomClosed?.();
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (!isClosed) {
            reconnectTimer = setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      }
    });
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollInterval) clearInterval(pollInterval);
    peerUpdateListeners.delete(handlePeerUpdate);
    peerCloseListeners.delete(handlePeerClose);
    mpChannel?.removeEventListener('message', handleBcMessage);
    window.removeEventListener('storage', handleStorageEvent);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}
