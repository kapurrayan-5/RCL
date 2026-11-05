import Peer, { DataConnection } from 'peerjs';
import { MultiplayerRoom, RoomMember } from '../types/multiplayer';
import { FORMATIONS } from '../utils/formation';

// Global peer reference and active connections
let activePeer: Peer | null = null;
let activeConnections: DataConnection[] = [];
let currentRoomCode: string | null = null;

function normalizePeerId(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  return `rcl-p2p-${clean}`;
}

export function initHostP2P(
  room: MultiplayerRoom,
  onRoomUpdated: (updatedRoom: MultiplayerRoom) => void
): () => void {
  const targetId = normalizePeerId(room.code);
  currentRoomCode = room.code;

  try {
    if (activePeer) {
      activePeer.destroy();
      activePeer = null;
    }

    const peer = new Peer(targetId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    activePeer = peer;

    peer.on('open', (id) => {
      console.log(`[RCL P2P Host] Registered P2P room peer: ${id}`);
    });

    peer.on('connection', (conn) => {
      console.log(`[RCL P2P Host] Incoming peer connection from: ${conn.peer}`);
      activeConnections.push(conn);

      conn.on('open', () => {
        // Send current room state to newly connected peer immediately
        conn.send({ type: 'ROOM_UPDATE', room });
      });

      conn.on('data', (data: any) => {
        if (!data || typeof data !== 'object') return;

        if (data.type === 'JOIN_REQUEST') {
          const { memberName, clubName } = data;
          const cleanName = (memberName && memberName.trim()) ? memberName.trim() : 'Challenger';

          // Check if already in room
          let existing = room.members.find(m => m.name.toLowerCase() === cleanName.toLowerCase());
          if (!existing) {
            const memberId = `usr-${Math.random().toString(36).substring(2, 9)}`;
            const newMember: RoomMember = {
              id: memberId,
              name: cleanName,
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
            FORMATIONS['4-3-3'].slots.forEach(s => { newMember.startingXI[s.id] = null; });
            room.members.push(newMember);
            room.updatedAt = Date.now();
            existing = newMember;
          }

          // Broadcast updated room to all peers
          broadcastP2P({ type: 'ROOM_UPDATE', room, memberId: existing.id });
          onRoomUpdated(room);
        } else if (data.type === 'ACTION') {
          // Peer performed an action (e.g. draft pick, reroll)
          if (data.updatedRoom) {
            onRoomUpdated(data.updatedRoom);
            broadcastP2P({ type: 'ROOM_UPDATE', room: data.updatedRoom });
          }
        }
      });

      conn.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== conn);
      });
    });

    peer.on('error', (err: any) => {
      // If ID is already taken, someone else is hosting this room
      if (err.type === 'unavailable-id') {
        console.log(`[RCL P2P] Room ID ${targetId} active as host`);
      } else {
        console.warn(`[RCL P2P] Peer warning:`, err);
      }
    });
  } catch (e) {
    console.warn('[RCL P2P] Failed to initialize P2P host:', e);
  }

  return () => {
    activeConnections.forEach(c => c.close());
    activeConnections = [];
    if (activePeer) {
      activePeer.destroy();
      activePeer = null;
    }
  };
}

export function initClientP2P(
  roomCode: string,
  memberName: string,
  clubName: string,
  onRoomUpdated: (updatedRoom: MultiplayerRoom, memberId?: string) => void
): () => void {
  const hostId = normalizePeerId(roomCode);
  let conn: DataConnection | null = null;
  let peer: Peer | null = null;

  try {
    peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peer.on('open', () => {
      console.log(`[RCL P2P Client] Connecting to host: ${hostId}`);
      conn = peer!.connect(hostId, { reliable: true });

      conn.on('open', () => {
        console.log(`[RCL P2P Client] Connected to host via WebRTC! Sending join request...`);
        conn!.send({
          type: 'JOIN_REQUEST',
          memberName,
          clubName,
        });
      });

      conn.on('data', (data: any) => {
        if (data?.type === 'ROOM_UPDATE' && data.room) {
          onRoomUpdated(data.room, data.memberId);
        }
      });
    });

    peer.on('error', (err) => {
      console.warn(`[RCL P2P Client] Connect error:`, err);
    });
  } catch (err) {
    console.warn('[RCL P2P Client] Failed to init client peer:', err);
  }

  return () => {
    if (conn) conn.close();
    if (peer) peer.destroy();
  };
}

export function broadcastP2P(payload: any) {
  activeConnections.forEach(conn => {
    if (conn.open) {
      try {
        conn.send(payload);
      } catch (e) {
        // ignore
      }
    }
  });
}
