import { ClubSeason, Player } from '../types/game';
import { HISTORICAL_CLUBS } from './clubsDatabase';
import { MORE_CLUBS } from './moreClubsDatabase';
import { INTERNATIONAL_SQUADS } from './internationalClubs';
import { CULT_AND_UNDERDOG_CLUBS } from './cultClubsDatabase';

export const ALL_CLUBS: ClubSeason[] = [
  ...INTERNATIONAL_SQUADS,
  ...HISTORICAL_CLUBS,
  ...MORE_CLUBS,
  ...CULT_AND_UNDERDOG_CLUBS,
];

// Flat list of all unique players across all clubs
export const ALL_PLAYERS: Player[] = ALL_CLUBS.flatMap(c => c.roster);

// Get club by ID
export function getClubById(id: string): ClubSeason | undefined {
  return ALL_CLUBS.find(c => c.id === id);
}

// Get random club for scouting
export function getRandomClub(excludeIds: string[] = []): ClubSeason {
  const available = ALL_CLUBS.filter(c => !excludeIds.includes(c.id));
  const pool = available.length > 0 ? available : ALL_CLUBS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// Initial scouted reports for new players so they can immediately draft without a blank state
export const INITIAL_SCOUTED_CLUB_IDS = [
  'bra-1994',
  'rm-2016-17',
  'fcb-2010-11',
  'mun-2007-08',
  'eng-1966',
  'ger-1990',
];
