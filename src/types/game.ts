export type Position = 
  | 'GK' 
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'ST' | 'CF';

export type PositionCategory = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface Player {
  id: string;
  name: string;
  shortName: string;
  nationality: string;
  nationCode: string;
  clubId: string;
  clubName: string;
  seasonYear: string; // e.g. "2016-17"
  primaryPosition: Position;
  secondaryPositions: Position[];
  overall: number; // 60-99
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
  tacticalIQ: number;
  preferredFoot: 'Left' | 'Right' | 'Both';
  rarity: 'Legendary' | 'Rare' | 'Standard';
  badgeColor: string;
  accentColor: string;
  number?: number;
}

export interface ClubSeason {
  id: string;
  clubName: string;
  shortName: string;
  season: string;
  country: string;
  countryCode: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  tacticalStyle: string;
  squadRating: number;
  rarity: 'Legendary' | 'Rare' | 'Standard';
  stars: 1 | 2 | 3;
  summary: string;
  category: 'historical' | 'all-time' | 'custom';
  defaultFormation: FormationType;
  roster: Player[];
}

export type FormationType = 
  | '4-3-3'
  | '4-4-2'
  | '4-2-3-1'
  | '3-5-2'
  | '3-4-3'
  | '4-1-4-1'
  | '5-3-2'
  | '4-3-1-2'
  | '3-4-2-1';

export interface FormationSlot {
  id: string;
  label: string;
  position: Position;
  category: PositionCategory;
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top (GK at ~88%, ST at ~15%)
}

export interface FormationConfig {
  type: FormationType;
  name: string;
  description: string;
  slots: FormationSlot[];
}

export type GameDifficulty = 'Standard' | 'Advanced';
export type SimulationPacing = 'by_match' | 'automatic';

export interface TeamTactics {
  buildup: 'Direct' | 'Balanced' | 'Possession' | 'Counter';
  mentality: 'Defensive' | 'Balanced' | 'Attacking';
  defensiveLine: 'Low' | 'Medium' | 'High';
  pressing: 'Low' | 'Medium' | 'High';
  passing: 'Short' | 'Mixed' | 'Long';
  width: 'Narrow' | 'Balanced' | 'Wide';
  difficulty?: GameDifficulty;
}

export interface TeamAnalytics {
  overallRating: number;
  scoringRating: number;
  stoppingRating: number;
  teamworkRating: number;
  formationCompatibility: number;
  cardScore: number;
  positionCoverage: number;
  squadDepth: number;
}

export type MatchEventType = 
  | 'goal' 
  | 'assist' 
  | 'save' 
  | 'woodwork' 
  | 'shot_miss' 
  | 'yellow_card' 
  | 'red_card' 
  | 'half_time' 
  | 'full_time'
  | 'penalty_scored'
  | 'penalty_missed';

export interface MatchEvent {
  minute: number;
  isStoppage?: boolean;
  type: MatchEventType;
  team: 'home' | 'away';
  teamName: string;
  playerName: string;
  assistPlayerName?: string;
  description: string;
}

export interface MatchStats {
  possession: number; // e.g. 54 means 54% vs 46%
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  xG: { home: number; away: number };
  passAccuracy: { home: number; away: number };
  saves: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
}

export interface MatchTeamInfo {
  id: string;
  name: string;
  shortName: string;
  season?: string;
  primaryColor: string;
  secondaryColor: string;
  rating: number;
  lineup: Player[];
  tactics?: TeamTactics;
  isUser?: boolean;
}

export interface MatchSimulationResult {
  homeTeam: MatchTeamInfo;
  awayTeam: MatchTeamInfo;
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  wentToExtraTime?: boolean;
  wentToPenalties?: boolean;
  events: MatchEvent[];
  stats: MatchStats;
  winnerId: string | 'draw';
}

export interface TournamentGroupTeam {
  team: MatchTeamInfo;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TournamentGroup {
  id: string;
  name: string; // Group A, Group B, etc.
  teams: TournamentGroupTeam[];
  fixtures: {
    matchday: number;
    homeTeamId: string;
    awayTeamId: string;
    result?: MatchSimulationResult;
    played: boolean;
  }[];
}

export interface KnockoutMatch {
  id: string;
  stage: 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
  stageName: string;
  homeTeam: MatchTeamInfo | null;
  awayTeam: MatchTeamInfo | null;
  result?: MatchSimulationResult;
  played: boolean;
  winnerId?: string;
}

export type TournamentStage = 'group_stage' | 'round_of_16' | 'quarter_finals' | 'semi_finals' | 'final' | 'completed';

export interface TournamentState {
  id: string;
  name: string;
  format: 'standard_32' | 'knockout_16';
  userTeam: MatchTeamInfo;
  currentStage: TournamentStage;
  currentMatchday: number; // 1, 2, 3 for group stage
  groups: TournamentGroup[];
  knockoutMatches: KnockoutMatch[];
  isCompleted: boolean;
  championTeam?: MatchTeamInfo;
  runnerUpTeam?: MatchTeamInfo;
}

export interface TournamentHistoryRecord {
  id: string;
  date: string;
  format: string;
  squadName: string;
  finish: 'CHAMPION' | 'RUNNER-UP' | 'SEMI-FINALIST' | 'QUARTER-FINALIST' | 'ROUND OF 16 EXIT' | 'GROUP STAGE EXIT';
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  topScorer: { name: string; goals: number };
  topAssister: { name: string; assists: number };
  bestPlayer: { name: string; rating: number };
}

export interface ManagerCareer {
  managerName: string;
  clubName: string;
  tournamentsPlayed: number;
  trophiesWon: number;
  runnerUpCount: number;
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  totalGoalsScored: number;
  totalGoalsConceded: number;
  cleanSheets: number;
  history: TournamentHistoryRecord[];
}
