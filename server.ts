import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { MultiplayerRoom, RoomMember, HeadToHeadMatchState, MatchLiveEvent, LeaderboardEntry, MultiplayerMode } from './src/types/multiplayer';
import { ALL_CLUBS, getRandomClub } from './src/data/clubs';
import { FORMATIONS } from './src/utils/formation';
import { Player } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-Memory Storage
const rooms = new Map<string, MultiplayerRoom>();
const clientRooms = new Map<WebSocket, { roomCode: string; memberId: string }>();

// Seed Global Leaderboard with Legendary & Cult Managers
let globalLeaderboard: LeaderboardEntry[] = [
  { id: 'lb-1', managerName: 'Sir Alex Ferguson', clubName: 'Man United 2008', wins: 54, draws: 8, losses: 6, trophiesWon: 14, highestScore: 92, totalGoals: 168, winRate: 79 },
  { id: 'lb-2', managerName: 'Pep Guardiola', clubName: 'Barça 2011', wins: 49, draws: 9, losses: 5, trophiesWon: 12, highestScore: 94, totalGoals: 172, winRate: 78 },
  { id: 'lb-3', managerName: 'Carlo Ancelotti', clubName: 'Real Madrid 2017', wins: 46, draws: 11, losses: 7, trophiesWon: 11, highestScore: 93, totalGoals: 155, winRate: 72 },
  { id: 'lb-4', managerName: 'José Mourinho', clubName: 'Chelsea 2005', wins: 42, draws: 14, losses: 4, trophiesWon: 9, highestScore: 89, totalGoals: 128, winRate: 70 },
  { id: 'lb-5', managerName: 'Zinedine Zidane', clubName: 'Real Madrid 2018', wins: 38, draws: 10, losses: 8, trophiesWon: 8, highestScore: 91, totalGoals: 135, winRate: 68 },
  { id: 'lb-6', managerName: 'Claudio Ranieri', clubName: 'Leicester 2016', wins: 35, draws: 12, losses: 11, trophiesWon: 6, highestScore: 87, totalGoals: 112, winRate: 60 },
  { id: 'lb-7', managerName: 'Jürgen Klopp', clubName: 'Liverpool 2019', wins: 33, draws: 8, losses: 10, trophiesWon: 5, highestScore: 90, totalGoals: 124, winRate: 65 },
  { id: 'lb-8', managerName: 'Bobby Robson', clubName: 'Newcastle 2003', wins: 29, draws: 10, losses: 14, trophiesWon: 4, highestScore: 88, totalGoals: 104, winRate: 55 },
];

function broadcastToRoom(code: string, payload: any) {
  const message = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const info = clientRooms.get(client);
      if (info && info.roomCode === code.toUpperCase()) {
        client.send(message);
      }
    }
  });
}

function calculateTeamOverall(startingXI: Record<string, Player | null>): number {
  const players = Object.values(startingXI).filter((p): p is Player => p !== null);
  if (players.length === 0) return 60;
  const sum = players.reduce((acc, p) => acc + p.overall, 0);
  return Math.round(sum / players.length);
}

// WebSocket Event Handling
wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'SUBSCRIBE_ROOM') {
        const { roomCode, memberId } = msg;
        clientRooms.set(ws, { roomCode: roomCode.toUpperCase(), memberId });
        const room = rooms.get(roomCode.toUpperCase());
        if (room) {
          ws.send(JSON.stringify({ type: 'ROOM_UPDATE', room }));
        }
      } else if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (err) {
      // Ignore invalid payloads
    }
  });

  ws.on('close', () => {
    clientRooms.delete(ws);
  });
});

// REST Endpoints
app.get('/api/leaderboard', (_req, res) => {
  const sorted = [...globalLeaderboard].sort((a, b) => b.trophiesWon - a.trophiesWon || b.wins - a.wins);
  const ranked = sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
  res.json({ leaderboard: ranked });
});

app.post('/api/leaderboard/submit', (req, res) => {
  const { managerName, clubName, wins, draws, losses, trophiesWon, highestScore, totalGoals } = req.body;
  if (!managerName) {
    return res.status(400).json({ error: 'Manager name required' });
  }

  const existingIndex = globalLeaderboard.findIndex(e => e.managerName.toLowerCase() === managerName.toLowerCase());
  const totalMatches = (wins || 0) + (draws || 0) + (losses || 0);
  const winRate = totalMatches > 0 ? Math.round(((wins || 0) / totalMatches) * 100) : 0;

  if (existingIndex >= 0) {
    const existing = globalLeaderboard[existingIndex];
    globalLeaderboard[existingIndex] = {
      ...existing,
      clubName: clubName || existing.clubName,
      wins: Math.max(existing.wins, wins || 0),
      draws: Math.max(existing.draws, draws || 0),
      losses: Math.max(existing.losses, losses || 0),
      trophiesWon: Math.max(existing.trophiesWon, trophiesWon || 0),
      highestScore: Math.max(existing.highestScore, highestScore || 0),
      totalGoals: Math.max(existing.totalGoals, totalGoals || 0),
      winRate: Math.max(existing.winRate, winRate),
      isCurrentUser: true,
    };
  } else {
    globalLeaderboard.push({
      id: `usr-${Date.now()}`,
      managerName,
      clubName: clubName || 'RCL XI',
      wins: wins || 0,
      draws: draws || 0,
      losses: losses || 0,
      trophiesWon: trophiesWon || 0,
      highestScore: highestScore || 75,
      totalGoals: totalGoals || 0,
      winRate,
      isCurrentUser: true,
    });
  }

  res.json({ success: true });
});

// Create Room
app.post('/api/rooms/create', (req, res) => {
  const { hostName, clubName, mode, customCode } = req.body;
  const code = (customCode && customCode.trim() ? customCode.trim().toUpperCase() : `RCL-${Math.floor(100 + Math.random() * 900)}`).replace(/[^A-Z0-9-]/g, '').slice(0, 10);

  const initialClub = getRandomClub();
  const hostId = `usr-${Math.random().toString(36).substring(2, 9)}`;

  const hostMember: RoomMember = {
    id: hostId,
    name: hostName || 'Host Manager',
    clubName: clubName || 'Host XI',
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

  FORMATIONS['4-3-3'].slots.forEach(s => {
    hostMember.startingXI[s.id] = null;
  });

  const room: MultiplayerRoom = {
    code,
    name: `${hostMember.name}'s Room`,
    mode: (mode as MultiplayerMode) || '1v1',
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

  rooms.set(code, room);
  res.json({ room, currentMemberId: hostId });
});

// Join Room
app.post('/api/rooms/join', (req, res) => {
  const { code, memberName, clubName } = req.body;
  const roomCode = (code || '').trim().toUpperCase();
  const room = rooms.get(roomCode);

  if (!room) {
    return res.status(404).json({ error: 'Room not found. Check code and try again.' });
  }

  const maxCapacity = room.mode === '1v1' ? 2 : room.mode === 'TOURNAMENT_4' ? 4 : 8;
  if (room.members.length >= maxCapacity) {
    return res.status(400).json({ error: 'Room is already full.' });
  }

  if (room.status !== 'LOBBY') {
    return res.status(400).json({ error: 'Match/Draft has already started in this room.' });
  }

  const memberId = `usr-${Math.random().toString(36).substring(2, 9)}`;
  const newMember: RoomMember = {
    id: memberId,
    name: memberName || `Manager ${room.members.length + 1}`,
    clubName: clubName || `Challenger XI`,
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

  FORMATIONS['4-3-3'].slots.forEach(s => {
    newMember.startingXI[s.id] = null;
  });

  room.members.push(newMember);
  room.updatedAt = Date.now();

  broadcastToRoom(roomCode, { type: 'ROOM_UPDATE', room });
  res.json({ room, currentMemberId: memberId });
});

// Get Room State
app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room });
});

// Start Draft in Room
app.post('/api/rooms/start-draft', (req, res) => {
  const { code, memberId } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.hostId !== memberId) return res.status(403).json({ error: 'Only host can start draft' });

  room.status = 'DRAFT';
  room.currentTurnMemberId = room.members[0].id;
  room.turnIndex = 0;
  room.claimedPlayerIds = [];
  room.activeSquadId = getRandomClub().id;
  room.updatedAt = Date.now();

  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Room Draft Pick (Turn-based + Exclusive Claiming)
app.post('/api/rooms/draft-pick', (req, res) => {
  const { code, memberId, playerId, slotId } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Room is not drafting' });
  }

  // Exclusive player pool check: No duplicates allowed across managers!
  if (room.claimedPlayerIds.includes(playerId)) {
    return res.status(400).json({ error: 'Player has already been drafted by another manager!' });
  }

  const member = room.members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  // Locate player from active squad or full catalog
  const club = ALL_CLUBS.find(c => c.id === room.activeSquadId) || ALL_CLUBS[0];
  const player = club.roster.find(p => p.id === playerId) || ALL_CLUBS.flatMap(c => c.roster).find(p => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Lock player into member's starting XI
  member.startingXI[slotId] = player;
  member.draftPicksCount = Object.values(member.startingXI).filter(Boolean).length;
  room.claimedPlayerIds.push(player.id);

  // Update member analytics overview
  const teamOvr = calculateTeamOverall(member.startingXI);
  member.analytics.overallRating = teamOvr;

  // Next Turn / Roll Squad
  const memberIndex = room.members.findIndex(m => m.id === memberId);
  const nextMemberIndex = (memberIndex + 1) % room.members.length;
  room.currentTurnMemberId = room.members[nextMemberIndex].id;
  room.turnIndex += 1;

  // Automatically roll next squad
  const nextSquad = getRandomClub([room.activeSquadId]);
  room.activeSquadId = nextSquad.id;

  // Check if all members have filled all 11 slots
  const allFull = room.members.every(m => Object.values(m.startingXI).filter(Boolean).length >= 11);
  if (allFull) {
    room.status = 'READY_BATTLE';
  }

  room.updatedAt = Date.now();
  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Manual Reroll for current active drafter
app.post('/api/rooms/reroll', (req, res) => {
  const { code, memberId } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const member = room.members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  if (member.rerollsLeft <= 0) {
    return res.status(400).json({ error: 'No rerolls remaining' });
  }

  member.rerollsLeft -= 1;
  const nextSquad = getRandomClub([room.activeSquadId]);
  room.activeSquadId = nextSquad.id;
  room.updatedAt = Date.now();

  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Update Member Tactics & Formation
app.post('/api/rooms/update-tactics', (req, res) => {
  const { code, memberId, formation, tactics } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const member = room.members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  if (formation && formation !== member.formation) {
    member.formation = formation as any;
    // Map existing players to new slots
    const newConfig = FORMATIONS[formation as keyof typeof FORMATIONS];
    if (newConfig) {
      const newXI: Record<string, Player | null> = {};
      const unassigned = Object.values(member.startingXI).filter((p): p is Player => p !== null);
      newConfig.slots.forEach((s) => { newXI[s.id] = null; });
      unassigned.forEach((p, idx) => {
        if (newConfig.slots[idx]) newXI[newConfig.slots[idx].id] = p;
      });
      member.startingXI = newXI;
    }
  }

  if (tactics) {
    member.tactics = { ...member.tactics, ...tactics };
  }

  room.updatedAt = Date.now();
  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Member Toggle Ready for Battle
app.post('/api/rooms/ready', (req, res) => {
  const { code, memberId, ready } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const member = room.members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  member.ready = ready !== undefined ? ready : !member.ready;
  room.updatedAt = Date.now();

  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Launch Live Head-to-Head Battle or Tournament Match
app.post('/api/rooms/launch-match', (req, res) => {
  const { code, memberId } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.hostId !== memberId) return res.status(403).json({ error: 'Only host can launch match' });

  const home = room.members[0];
  const away = room.members[1] || room.members[0];

  // Initialize Live Head-to-Head Match State
  room.status = 'MATCH';
  room.h2hMatch = {
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
        description: 'Whistle sounds! Head-to-head battle kicks off under the floodlights.',
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

  room.updatedAt = Date.now();
  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Advance/Simulate Head-to-Head Match Step
app.post('/api/rooms/step-match', (req, res) => {
  const { code } = req.body;
  const room = rooms.get((code || '').toUpperCase());
  if (!room || !room.h2hMatch || room.h2hMatch.isFinished) {
    return res.status(400).json({ error: 'Match is not in progress' });
  }

  const match = room.h2hMatch;
  const home = room.members.find(m => m.id === match.homeMemberId)!;
  const away = room.members.find(m => m.id === match.awayMemberId)!;

  const homePlayers = Object.values(home.startingXI).filter((p): p is Player => p !== null);
  const awayPlayers = Object.values(away.startingXI).filter((p): p is Player => p !== null);

  const homeOvr = calculateTeamOverall(home.startingXI);
  const awayOvr = calculateTeamOverall(away.startingXI);

  // Advance by 5-10 minutes per step
  match.minute = Math.min(90, match.minute + Math.floor(Math.random() * 6 + 6));

  // Determine potential event
  const isHomeAttacking = Math.random() * (homeOvr + 10) > Math.random() * (awayOvr + 10);
  const attackingTeam = isHomeAttacking ? 'home' : 'away';
  const attackerPool = isHomeAttacking ? homePlayers : awayPlayers;
  const defenderPool = isHomeAttacking ? awayPlayers : homePlayers;

  const randomAttacker = attackerPool[Math.floor(Math.random() * attackerPool.length)] || { shortName: 'Striker' };
  const randomDefender = defenderPool[Math.floor(Math.random() * defenderPool.length)] || { shortName: 'Defender' };

  // Update stats
  match.stats.possession = [
    Math.min(75, Math.max(25, Math.round(50 + (homeOvr - awayOvr) * 1.5 + (Math.random() * 8 - 4)))),
    0,
  ];
  match.stats.possession[1] = 100 - match.stats.possession[0];

  const roll = Math.random();
  if (roll < 0.22) {
    // Goal!
    if (attackingTeam === 'home') match.homeScore += 1;
    else match.awayScore += 1;

    match.events.unshift({
      id: `ev-${Date.now()}`,
      minute: match.minute,
      type: 'GOAL',
      team: attackingTeam,
      playerName: randomAttacker.shortName,
      description: `GOAL! ${randomAttacker.shortName} unleashes a sublime strike past the keeper!`,
      scoreline: `${match.homeScore} - ${match.awayScore}`,
    });
  } else if (roll < 0.55) {
    // Chance / Save
    match.events.unshift({
      id: `ev-${Date.now()}`,
      minute: match.minute,
      type: 'SAVE',
      team: attackingTeam,
      playerName: randomDefender.shortName,
      description: `Great stop! ${randomDefender.shortName} shuts down a fierce blast from ${randomAttacker.shortName}.`,
      scoreline: `${match.homeScore} - ${match.awayScore}`,
    });
  }

  // Check 90 min completion
  if (match.minute >= 90) {
    match.isFinished = true;
    room.status = 'COMPLETED';

    if (match.homeScore > match.awayScore) {
      match.winnerId = home.id;
    } else if (match.awayScore > match.homeScore) {
      match.winnerId = away.id;
    } else {
      // Penalty shootout decider if tied
      const penaltiesHome = 4 + (Math.random() > 0.5 ? 1 : 0);
      const penaltiesAway = penaltiesHome === 5 ? 4 : 5;
      match.winnerId = penaltiesHome > penaltiesAway ? home.id : away.id;
      match.events.unshift({
        id: `ev-pen`,
        minute: 90,
        type: 'GOAL',
        team: penaltiesHome > penaltiesAway ? 'home' : 'away',
        playerName: 'Shootout',
        description: `Full time draw! Decided on penalty kicks (${penaltiesHome} - ${penaltiesAway}).`,
        scoreline: `${match.homeScore} - ${match.awayScore} (${penaltiesHome}-${penaltiesAway} pens)`,
      });
    }

    // Award Leaderboard Stats
    const winnerMember = room.members.find(m => m.id === match.winnerId);
    if (winnerMember) {
      const existing = globalLeaderboard.find(e => e.managerName.toLowerCase() === winnerMember.name.toLowerCase());
      if (existing) {
        existing.wins += 1;
        existing.trophiesWon += 1;
        existing.totalGoals += match.winnerId === home.id ? match.homeScore : match.awayScore;
      }
    }
  }

  room.updatedAt = Date.now();
  broadcastToRoom(room.code, { type: 'ROOM_UPDATE', room });
  res.json({ room });
});

// Vite Integration & Server Startup
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RCL Full-Stack Server active on port ${PORT}`);
  });
}

startServer();
