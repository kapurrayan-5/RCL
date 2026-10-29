import { FormationType, TeamTactics } from '../types/game';
import { LeaderboardEntry, MultiplayerMode, MultiplayerRoom } from '../types/multiplayer';

export async function createRoomApi(
  hostName: string,
  clubName: string,
  mode: MultiplayerMode,
  customCode?: string
): Promise<{ room: MultiplayerRoom; currentMemberId: string }> {
  const res = await fetch('/api/rooms/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, clubName, mode, customCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create room' }));
    throw new Error(err.error || 'Failed to create room');
  }
  return res.json();
}

export async function joinRoomApi(
  code: string,
  memberName: string,
  clubName: string
): Promise<{ room: MultiplayerRoom; currentMemberId: string }> {
  const res = await fetch('/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberName, clubName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to join room' }));
    throw new Error(err.error || 'Failed to join room');
  }
  return res.json();
}

export async function getRoomApi(code: string): Promise<MultiplayerRoom> {
  const res = await fetch(`/api/rooms/${code}`);
  if (!res.ok) {
    throw new Error('Room not found');
  }
  const data = await res.json();
  return data.room;
}

export async function startDraftApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/start-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to start draft' }));
    throw new Error(err.error || 'Failed to start draft');
  }
  const data = await res.json();
  return data.room;
}

export async function draftPickApi(
  code: string,
  memberId: string,
  playerId: string,
  slotId: string
): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/draft-pick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberId, playerId, slotId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to draft player' }));
    throw new Error(err.error || 'Failed to draft player');
  }
  const data = await res.json();
  return data.room;
}

export async function rerollSquadApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/reroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to reroll' }));
    throw new Error(err.error || 'Failed to reroll');
  }
  const data = await res.json();
  return data.room;
}

export async function updateTacticsApi(
  code: string,
  memberId: string,
  formation?: FormationType,
  tactics?: Partial<TeamTactics>
): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/update-tactics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberId, formation, tactics }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update tactics' }));
    throw new Error(err.error || 'Failed to update tactics');
  }
  const data = await res.json();
  return data.room;
}

export async function toggleReadyApi(code: string, memberId: string, ready?: boolean): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberId, ready }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to toggle ready' }));
    throw new Error(err.error || 'Failed to toggle ready');
  }
  const data = await res.json();
  return data.room;
}

export async function launchMatchApi(code: string, memberId: string): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/launch-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, memberId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to launch match' }));
    throw new Error(err.error || 'Failed to launch match');
  }
  const data = await res.json();
  return data.room;
}

export async function stepMatchApi(code: string): Promise<MultiplayerRoom> {
  const res = await fetch('/api/rooms/step-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to advance match' }));
    throw new Error(err.error || 'Failed to advance match');
  }
  const data = await res.json();
  return data.room;
}

export async function getLeaderboardApi(): Promise<LeaderboardEntry[]> {
  const res = await fetch('/api/leaderboard');
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.leaderboard || [];
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
  const res = await fetch('/api/leaderboard/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return res.ok;
}

// WebSocket Connection Helper with Auto-Reconnect
export function subscribeToRoomSocket(
  code: string,
  memberId: string,
  onUpdate: (room: MultiplayerRoom) => void
): () => void {
  let ws: WebSocket | null = null;
  let isClosed = false;
  let reconnectTimer: any = null;

  function connect() {
    if (isClosed) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: 'SUBSCRIBE_ROOM', roomCode: code, memberId }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ROOM_UPDATE' && payload.room) {
            onUpdate(payload.room);
          }
        } catch (e) {
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
    } catch (err) {
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 2000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}
