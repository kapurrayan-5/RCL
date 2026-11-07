import { FormationType, Player, TeamTactics } from '../types/game';
import { LeaderboardEntry, MultiplayerMode, MultiplayerRoom, RoomMember } from '../types/multiplayer';
import { ALL_CLUBS, getRandomClub } from '../data/clubs';
import { FORMATIONS } from '../utils/formation';

// Cross-tab broadcast channel for instant multi-window local sync
const mpChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('rcl_multiplayer_bus')
  : null;

// Persistent session management for active manager
export function saveLocalSession(roomCode: string, memberId: string) {
  try {
    const clean = roomCode.trim().toUpperCase();
    localStorage.setItem('rcl_active_room_code', clean);
    localStorage.setItem('rcl_active_member_id', memberId);
    sessionStorage.setItem('rcl_active_room_code', clean);
    sessionStorage.setItem('rcl_active_member_id', memberId);
  } catch {
    // ignore
  }
}

export function getLocalSession(): { roomCode: string | null; memberId: string | null } {
  try {
    const roomCode = sessionStorage.getItem('rcl_active_room_code') || localStorage.getItem('rcl_active_room_code');
    const memberId = sessionStorage.getItem('rcl_active_member_id') || localStorage.getItem('rcl_active_member_id');
    return { roomCode, memberId };
  } catch {
    return { roomCode: null, memberId: null };
  }
}

export function clearLocalSession() {
  try {
    localStorage.removeItem('rcl_active_room_code');
    localStorage.removeItem('rcl_active_member_id');
    sessionStorage.removeItem('rcl_active_room_code');
    sessionStorage.removeItem('rcl_active_member_id');
  } catch {
    // ignore
  }
}

// Local room storage helpers
export function getLocalRoom(code: string): MultiplayerRoom | null {
  try {
    const clean = code.trim().toUpperCase();
    const raw = localStorage.getItem(`rcl_room_${clean}`);
    if (raw) return JSON.parse(raw);

    // Try without prefix/hyphen
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

export function saveLocalRoom(room: MultiplayerRoom) {
  try {
    const code = room.code.trim().toUpperCase();
    localStorage.setItem(`rcl_room_${code}`, JSON.stringify(room));
    localStorage.setItem('rcl_last_active_room', code);
    if (mpChannel) {
      mpChannel.postMessage({ type: 'ROOM_UPDATE', room });
    }
  } catch {
    // ignore
  }
}

function createLocalFallbackRoom(
  hostName: string,
  clubName: string,
  mode: MultiplayerMode,
  customCode?: string
): { room: MultiplayerRoom; currentMemberId: string } {
  let code = (customCode && customCode.trim() ? customCode.trim().toUpperCase() : `RCL-${Math.floor(100 + Math.random() * 900)}`).replace(/[^A-Z0-9-]/g, '').slice(0, 10);
  if (!code) code = `RCL-${Math.floor(100 + Math.random() * 900)}`;

  const hostId = `usr-${Math.random().toString(36).substring(2, 9)}`;
  const initialClub = getRandomClub();

  const hostMember: RoomMember = {
    id: hostId,
    name: hostName || 'Host Manager',
    clubName: clubName || 'RCL Dream XI',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    isHost: true,
    ready: true,
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

  FORMATIONS['4-3-3'].slots.forEach(s => {
    hostMember.startingXI[s.id] = null;
  });

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
  return { room, currentMemberId: hostId };
}

export async function createRoomApi(
  hostName: string,
  clubName: string,
  mode: MultiplayerMode,
  customCode?: string
): Promise<{ room: MultiplayerRoom; currentMemberId: string }> {
  try {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, clubName, mode, customCode }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        saveLocalSession(data.room.code, data.currentMemberId);
        return data;
      }
    } else {
      const err = await res.json().catch(() => null);
      if (err?.error) throw new Error(err.error);
    }
  } catch (err: any) {
    console.warn('[RCL] Server create room endpoint warning:', err);
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Graceful fallback for offline mode
  const fallback = createLocalFallbackRoom(hostName, clubName, mode, customCode);
  saveLocalSession(fallback.room.code, fallback.currentMemberId);

  // Sync to server in background
  fetch('/api/rooms/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: fallback.room }),
  }).catch(() => {});

  return fallback;
}

export async function joinRoomApi(
  code: string,
  memberName: string,
  clubName: string
): Promise<{ room: MultiplayerRoom; currentMemberId: string }> {
  let roomCode = (code || '').trim().toUpperCase();
  // If user pasted a URL or parameter e.g. "?room=RCL-834", extract code
  if (roomCode.includes('ROOM=')) {
    const match = roomCode.match(/ROOM=([A-Z0-9-]+)/i);
    if (match && match[1]) {
      roomCode = match[1].trim().toUpperCase();
    }
  }
  roomCode = roomCode.replace(/^[#?]/, '').trim();

  // Auto-prefix RCL- if user only entered digits e.g. "382"
  if (/^\d{3,4}$/.test(roomCode)) {
    roomCode = `RCL-${roomCode}`;
  }

  const session = getLocalSession();
  const existingMemberId = session.memberId && session.roomCode === roomCode ? session.memberId : undefined;

  // 1. Authoritative Server Request
  try {
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

    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        saveLocalSession(data.room.code, data.currentMemberId);
        return data;
      }
    } else {
      const err = await res.json().catch(() => null);
      if (err?.error) {
        // If server says not found, check if host created it in local storage (cross-tab on same machine)
        if (err.error.toLowerCase().includes('not found')) {
          const localRoom = getLocalRoom(roomCode);
          if (localRoom) {
            try {
              // Sync local room to server and retry join
              const syncRes = await fetch('/api/rooms/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room: localRoom }),
              });
              if (syncRes.ok) {
                const retryRes = await fetch('/api/rooms/join', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code: roomCode,
                    memberName,
                    clubName,
                    memberId: existingMemberId,
                  }),
                });
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  if (retryData?.room) {
                    saveLocalRoom(retryData.room);
                    saveLocalSession(retryData.room.code, retryData.currentMemberId);
                    return retryData;
                  }
                }
              }
            } catch {
              // ignore sync failure
            }
          }
        }
        throw new Error(err.error);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('network')) {
      throw err;
    }
    console.warn('[RCL] Server join room endpoint warning:', err);
  }

  // 2. Check local fallback (works across tabs in same browser if server unreachable)
  const localRoom = getLocalRoom(roomCode);
  if (!localRoom) {
    throw new Error(`Room "${roomCode}" not found. Verify the code with the host.`);
  }

  const cleanName = (memberName && memberName.trim()) ? memberName.trim() : 'Challenger';
  const existing = localRoom.members.find(m => m.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    existing.ready = true;
    localRoom.updatedAt = Date.now();
    saveLocalRoom(localRoom);
    saveLocalSession(localRoom.code, existing.id);
    return { room: localRoom, currentMemberId: existing.id };
  }

  const maxCapacity = localRoom.mode === '1v1' ? 2 : localRoom.mode === 'TOURNAMENT_4' ? 4 : 8;
  if (localRoom.members.length >= maxCapacity) {
    throw new Error('This room is already at full capacity.');
  }

  const memberId = `usr-${Math.random().toString(36).substring(2, 9)}`;
  const newMember: RoomMember = {
    id: memberId,
    name: localRoom.members.some(m => m.name.toLowerCase() === cleanName.toLowerCase()) ? `${cleanName} (2)` : cleanName,
    clubName: clubName || 'Challenger XI',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    isHost: false,
    ready: true,
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

  FORMATIONS['4-3-3'].slots.forEach(s => {
    newMember.startingXI[s.id] = null;
  });

  localRoom.members.push(newMember);
  localRoom.updatedAt = Date.now();
  saveLocalRoom(localRoom);
  saveLocalSession(localRoom.code, memberId);

  // Sync to server
  fetch('/api/rooms/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: localRoom }),
  }).catch(() => {});

  return { room: localRoom, currentMemberId: memberId };
}

export async function addBotApi(code: string): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();

  try {
    const res = await fetch('/api/rooms/add-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback to local
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');

  const BOT_MANAGERS = [
    { name: 'Pep Guardiola', club: 'Barça 2011' },
    { name: 'Sir Alex Ferguson', club: 'Man United 2008' },
    { name: 'Carlo Ancelotti', club: 'Real Madrid 2017' },
    { name: 'José Mourinho', club: 'Chelsea 2005' },
    { name: 'Claudio Ranieri', club: 'Leicester 2016' },
  ];
  const botInfo = BOT_MANAGERS[Math.floor(Math.random() * BOT_MANAGERS.length)];
  const botId = `bot-${Math.random().toString(36).substring(2, 9)}`;

  const botMember: RoomMember = {
    id: botId,
    name: `${botInfo.name} (AI)`,
    clubName: botInfo.club,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
    isHost: false,
    ready: true,
    formation: '4-3-3',
    tactics: {
      buildup: 'Direct',
      mentality: 'Attacking',
      defensiveLine: 'High',
      pressing: 'High',
      passing: 'Mixed',
      width: 'Wide',
    },
    startingXI: {},
    analytics: {
      overallRating: 84,
      scoringRating: 82,
      stoppingRating: 80,
      teamworkRating: 85,
      formationCompatibility: 85,
      cardScore: 84,
      positionCoverage: 80,
      squadDepth: 75,
    },
    rerollsLeft: 3,
    draftPicksCount: 0,
    matchScore: 0,
    isBot: true,
  };

  FORMATIONS['4-3-3'].slots.forEach(s => {
    botMember.startingXI[s.id] = null;
  });

  local.members.push(botMember);
  local.updatedAt = Date.now();
  saveLocalRoom(local);

  fetch('/api/rooms/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: local }),
  }).catch(() => {});

  return local;
}

export async function getRoomApi(code: string): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (local) return local;
  throw new Error('Room not found');
}

export async function startDraftApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/start-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  local.status = 'DRAFT';
  local.currentTurnMemberId = local.members[0].id;
  local.turnIndex = 0;
  local.claimedPlayerIds = [];
  local.activeSquadId = getRandomClub().id;
  local.updatedAt = Date.now();
  saveLocalRoom(local);
  return local;
}

export async function draftPickApi(
  code: string,
  memberId: string,
  playerId: string,
  slotId: string
): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/draft-pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId, playerId, slotId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');

  if (local.claimedPlayerIds.includes(playerId)) {
    throw new Error('Player already claimed');
  }

  const member = local.members.find(m => m.id === memberId);
  if (!member) throw new Error('Member not found');

  const club = ALL_CLUBS.find(c => c.id === local.activeSquadId) || ALL_CLUBS[0];
  const player = club.roster.find(p => p.id === playerId) || ALL_CLUBS.flatMap(c => c.roster).find(p => p.id === playerId);
  if (!player) throw new Error('Player not found');

  member.startingXI[slotId] = player;
  member.draftPicksCount = Object.values(member.startingXI).filter(Boolean).length;
  local.claimedPlayerIds.push(player.id);

  const players = Object.values(member.startingXI).filter((p): p is Player => p !== null);
  member.analytics.overallRating = players.length > 0 ? Math.round(players.reduce((a, b) => a + b.overall, 0) / players.length) : 60;

  const currentIdx = local.members.findIndex(m => m.id === memberId);
  const nextIdx = (currentIdx + 1) % local.members.length;
  local.currentTurnMemberId = local.members[nextIdx].id;
  local.turnIndex += 1;
  local.activeSquadId = getRandomClub([local.activeSquadId]).id;

  const allFull = local.members.every(m => Object.values(m.startingXI).filter(Boolean).length >= 11);
  if (allFull) {
    local.status = 'READY_BATTLE';
  }

  local.updatedAt = Date.now();
  saveLocalRoom(local);

  // If next is bot, auto-play bot turn
  const nextMem = local.members[nextIdx];
  if (nextMem && nextMem.isBot && local.status === 'DRAFT') {
    setTimeout(() => {
      const currentSquad = ALL_CLUBS.find(c => c.id === local.activeSquadId) || ALL_CLUBS[0];
      const emptySlot = Object.entries(nextMem.startingXI).find(([, p]) => p === null);
      if (emptySlot) {
        const candidate = currentSquad.roster.find(p => !local.claimedPlayerIds.includes(p.id));
        if (candidate) {
          nextMem.startingXI[emptySlot[0]] = candidate;
          local.claimedPlayerIds.push(candidate.id);
          const nextPls = Object.values(nextMem.startingXI).filter((p): p is Player => p !== null);
          nextMem.analytics.overallRating = Math.round(nextPls.reduce((a, b) => a + b.overall, 0) / nextPls.length);
          local.currentTurnMemberId = local.members[currentIdx].id;
          local.turnIndex += 1;
          local.activeSquadId = getRandomClub([local.activeSquadId]).id;
          if (local.members.every(m => Object.values(m.startingXI).filter(Boolean).length >= 11)) {
            local.status = 'READY_BATTLE';
          }
          local.updatedAt = Date.now();
          saveLocalRoom(local);
        }
      }
    }, 500);
  }

  return local;
}

export async function rerollSquadApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/reroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const member = local.members.find(m => m.id === memberId);
  if (!member || member.rerollsLeft <= 0) throw new Error('No rerolls left');

  member.rerollsLeft -= 1;
  local.activeSquadId = getRandomClub([local.activeSquadId]).id;
  local.updatedAt = Date.now();
  saveLocalRoom(local);
  return local;
}

export async function updateTacticsApi(
  code: string,
  memberId: string,
  formation?: FormationType,
  tactics?: Partial<TeamTactics>
): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/update-tactics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId, formation, tactics }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const member = local.members.find(m => m.id === memberId);
  if (member) {
    if (formation) member.formation = formation;
    if (tactics) member.tactics = { ...member.tactics, ...tactics };
    local.updatedAt = Date.now();
    saveLocalRoom(local);
  }
  return local;
}

export async function toggleReadyApi(code: string, memberId: string, ready?: boolean): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId, ready }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const member = local.members.find(m => m.id === memberId);
  if (member) {
    member.ready = ready !== undefined ? ready : !member.ready;
    local.updatedAt = Date.now();
    saveLocalRoom(local);
  }
  return local;
}

export async function launchMatchApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/launch-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, memberId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
  }

  const local = getLocalRoom(roomCode);
  if (!local) throw new Error('Room not found');
  const home = local.members[0];
  const away = local.members[1] || local.members[0];

  local.status = 'MATCH';
  local.h2hMatch = {
    matchId: `m-${Date.now()}`,
    homeMemberId: home.id,
    awayMemberId: away.id,
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    isFinished: false,
    events: [
      {
        id: `ev-0`,
        minute: 1,
        type: 'CHANCE',
        team: 'home',
        playerName: 'Referee',
        description: 'Whistle blows! 1v1 battle kicks off.',
        scoreline: '0 - 0',
      },
    ],
    stats: {
      possession: [50, 50],
      shots: [0, 0],
      shotsOnTarget: [0, 0],
      tackles: [0, 0],
    },
    winnerId: null,
  };
  local.updatedAt = Date.now();
  saveLocalRoom(local);
  return local;
}

export async function stepMatchApi(code: string): Promise<MultiplayerRoom> {
  const roomCode = (code || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/rooms/step-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.room) {
        saveLocalRoom(data.room);
        return data.room;
      }
    }
  } catch {
    // fallback
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
  return local;
}

export async function getLeaderboardApi(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      return data.leaderboard || [];
    }
  } catch {
    // fallback
  }

  return [
    { id: 'lb-1', managerName: 'Sir Alex Ferguson', clubName: 'Man United 2008', wins: 54, draws: 8, losses: 6, trophiesWon: 14, highestScore: 92, totalGoals: 168, winRate: 79, rank: 1 },
    { id: 'lb-2', managerName: 'Pep Guardiola', clubName: 'Barça 2011', wins: 49, draws: 9, losses: 5, trophiesWon: 12, highestScore: 94, totalGoals: 172, winRate: 78, rank: 2 },
    { id: 'lb-3', managerName: 'Carlo Ancelotti', clubName: 'Real Madrid 2017', wins: 46, draws: 11, losses: 7, trophiesWon: 11, highestScore: 93, totalGoals: 155, winRate: 72, rank: 3 },
    { id: 'lb-4', managerName: 'Claudio Ranieri', clubName: 'Leicester 2016', wins: 35, draws: 12, losses: 11, trophiesWon: 6, highestScore: 87, totalGoals: 112, winRate: 60, rank: 4 },
  ];
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

// WebSocket Connection Helper with Auto-Reconnect, BroadcastChannel & Polling Fallback
export function subscribeToRoomSocket(
  code: string,
  memberId: string,
  onUpdate: (room: MultiplayerRoom) => void
): () => void {
  const roomCode = code.toUpperCase();
  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;
  let pollInterval: any = null;

  // 1. Immediately fetch fresh room state on mount
  getRoomApi(roomCode).then(r => {
    if (r && !isClosed) onUpdate(r);
  }).catch(() => {});

  // 2. Cross-tab Broadcast Channel listener
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data?.type === 'ROOM_UPDATE' && event.data?.room) {
      const incCode = event.data.room.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
      if (incCode === curCode) {
        onUpdate(event.data.room);
      }
    }
  };
  mpChannel?.addEventListener('message', handleBcMessage);

  // 3. Storage event listener (across browser tabs)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && e.key.startsWith('rcl_room_') && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        const incCode = (parsed.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const curCode = roomCode.replace(/[^A-Z0-9]/g, '');
        if (incCode === curCode) {
          onUpdate(parsed);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 4. Fast Polling every 600ms (reliable real-time sync across devices and proxies)
  pollInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      const room = await getRoomApi(roomCode);
      if (room && !isClosed) onUpdate(room);
    } catch {
      // ignore
    }
  }, 600);

  // 5. WebSocket connection using explicit /ws path
  function connect() {
    if (isClosed) return;
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
            saveLocalRoom(payload.room);
            onUpdate(payload.room);
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
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollInterval) clearInterval(pollInterval);
    mpChannel?.removeEventListener('message', handleBcMessage);
    window.removeEventListener('storage', handleStorageEvent);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}
