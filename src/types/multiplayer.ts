import { FormationType, Player, TeamAnalytics, TeamTactics } from './game';

export type MultiplayerMode = '1v1' | 'TOURNAMENT_4' | 'TOURNAMENT_8';

export type RoomStatus = 'LOBBY' | 'DRAFT' | 'READY_BATTLE' | 'MATCH' | 'COMPLETED';

export interface RoomMember {
  id: string;
  name: string;
  clubName: string;
  avatar: string;
  isHost: boolean;
  ready: boolean;
  formation: FormationType;
  tactics: TeamTactics;
  startingXI: Record<string, Player | null>;
  analytics: TeamAnalytics;
  rerollsLeft: number;
  draftPicksCount: number;
  matchScore: number;
  isBot?: boolean;
}

export interface MatchLiveEvent {
  id: string;
  minute: number;
  type: 'GOAL' | 'SAVE' | 'CHANCE' | 'TACKLE' | 'YELLOW_CARD' | 'RED_CARD';
  team: 'home' | 'away';
  playerName: string;
  description: string;
  scoreline: string;
}

export interface HeadToHeadMatchState {
  matchId: string;
  homeMemberId: string;
  awayMemberId: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  isFinished: boolean;
  events: MatchLiveEvent[];
  stats: {
    possession: [number, number];
    shots: [number, number];
    shotsOnTarget: [number, number];
    tackles: [number, number];
  };
  winnerId: string | null;
}

export interface BracketMatch {
  id: string;
  roundName: string; // 'Semi-Final', 'Final', etc.
  homeMemberId: string;
  awayMemberId: string;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
  isFinished: boolean;
}

export interface MultiplayerRoom {
  code: string;
  name: string;
  mode: MultiplayerMode;
  status: RoomStatus;
  hostId: string;
  members: RoomMember[];
  currentTurnMemberId: string;
  turnIndex: number;
  claimedPlayerIds: string[]; // Exclusive draft pool: claimed by ANY manager, locked for everyone else
  activeSquadId: string; // Currently scouted squad shown in turn-based draft
  h2hMatch: HeadToHeadMatchState | null;
  bracket: BracketMatch[] | null;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  managerName: string;
  clubName: string;
  wins: number;
  draws: number;
  losses: number;
  trophiesWon: number;
  highestScore: number;
  totalGoals: number;
  winRate: number;
  rank?: number;
  isCurrentUser?: boolean;
}
