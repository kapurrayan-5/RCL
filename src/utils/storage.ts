import { ClubSeason, FormationType, ManagerCareer, Player, TeamTactics, TournamentHistoryRecord } from '../types/game';
import { ALL_CLUBS, INITIAL_SCOUTED_CLUB_IDS } from '../data/clubs';

const STORAGE_KEYS = {
  CAREER: 'rcl_manager_career_v1',
  SQUAD: 'rcl_custom_squad_v1',
  SCOUTED_CLUBS: 'rcl_scouted_clubs_v1',
  TACTICS: 'rcl_tactics_v1',
  SETTINGS: 'rcl_settings_v1',
};

export interface GameSettings {
  soundEnabled: boolean;
  guidedEnabled: boolean;
  simulationSpeed: 'slow' | 'normal' | 'fast' | 'ultra';
  autoFillRecommendations: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  guidedEnabled: true,
  simulationSpeed: 'normal',
  autoFillRecommendations: true,
};

export const DEFAULT_CAREER: ManagerCareer = {
  managerName: 'Alex Mercer',
  clubName: 'RCL All-Stars FC',
  tournamentsPlayed: 0,
  trophiesWon: 0,
  runnerUpCount: 0,
  totalMatches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  totalGoalsScored: 0,
  totalGoalsConceded: 0,
  cleanSheets: 0,
  history: [],
};

export const DEFAULT_TACTICS: TeamTactics = {
  buildup: 'Balanced',
  mentality: 'Balanced',
  defensiveLine: 'Medium',
  pressing: 'High',
  passing: 'Short',
  width: 'Balanced',
};

// Career storage
export function loadCareer(): ManagerCareer {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CAREER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load career:', e);
  }
  return DEFAULT_CAREER;
}

export function saveCareer(career: ManagerCareer) {
  try {
    localStorage.setItem(STORAGE_KEYS.CAREER, JSON.stringify(career));
  } catch (e) {
    console.error('Failed to save career:', e);
  }
}

// Record tournament completion into career
export function recordTournamentCompletion(record: TournamentHistoryRecord) {
  const career = loadCareer();
  career.tournamentsPlayed += 1;
  if (record.finish === 'CHAMPION') career.trophiesWon += 1;
  if (record.finish === 'RUNNER-UP') career.runnerUpCount += 1;

  career.totalMatches += record.matchesPlayed;
  career.wins += record.wins;
  career.draws += record.draws;
  career.losses += record.losses;
  career.totalGoalsScored += record.goalsScored;
  career.totalGoalsConceded += record.goalsConceded;
  career.cleanSheets += record.cleanSheets;

  career.history.unshift(record);
  saveCareer(career);
}

// Scouted clubs storage
export function loadScoutedClubIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCOUTED_CLUBS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load scouted clubs:', e);
  }
  return INITIAL_SCOUTED_CLUB_IDS;
}

export function saveScoutedClubIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SCOUTED_CLUBS, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save scouted clubs:', e);
  }
}

// Tactics storage
export function loadTactics(): TeamTactics {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TACTICS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load tactics:', e);
  }
  return DEFAULT_TACTICS;
}

export function saveTactics(tactics: TeamTactics) {
  try {
    localStorage.setItem(STORAGE_KEYS.TACTICS, JSON.stringify(tactics));
  } catch (e) {
    console.error('Failed to save tactics:', e);
  }
}

// Settings storage
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// Reset all game data
export function resetAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CAREER);
    localStorage.removeItem(STORAGE_KEYS.SQUAD);
    localStorage.removeItem(STORAGE_KEYS.SCOUTED_CLUBS);
    localStorage.removeItem(STORAGE_KEYS.TACTICS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  } catch (e) {
    console.error('Failed to reset data:', e);
  }
}
