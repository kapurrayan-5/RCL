import { ALL_CLUBS } from '../data/clubs';
import {
  ClubSeason,
  KnockoutMatch,
  MatchSimulationResult,
  MatchTeamInfo,
  TournamentGroup,
  TournamentGroupTeam,
  TournamentState,
} from '../types/game';
import { simulateMatch } from './simulation';

// Convert ClubSeason to MatchTeamInfo
export function clubToMatchTeam(club: ClubSeason): MatchTeamInfo {
  return {
    id: club.id,
    name: `${club.clubName} (${club.season})`,
    shortName: club.shortName,
    season: club.season,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    rating: club.squadRating,
    lineup: club.roster.slice(0, 11),
    isUser: false,
  };
}

// Generate the 32-team tournament
export function initializeTournament(
  userTeam: MatchTeamInfo,
  format: 'standard_32' | 'knockout_16' = 'standard_32'
): TournamentState {
  const opponentClubs = ALL_CLUBS.filter(c => c.id !== userTeam.id);
  // Shuffle opponents
  const shuffled = [...opponentClubs].sort(() => Math.random() - 0.5);

  if (format === 'standard_32') {
    // Pick 31 opponent clubs (or recycle if needed)
    const needed = 31;
    const selectedOpponents: MatchTeamInfo[] = [];
    let idx = 0;
    while (selectedOpponents.length < needed) {
      const club = shuffled[idx % shuffled.length];
      selectedOpponents.push(clubToMatchTeam(club));
      idx++;
    }

    const all32Teams: MatchTeamInfo[] = [userTeam, ...selectedOpponents];
    const groupNames = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
    const groups: TournamentGroup[] = [];

    // Group A gets User Team + 3 opponents
    for (let g = 0; g < 8; g++) {
      const groupTeamsRaw = all32Teams.slice(g * 4, g * 4 + 4);
      const groupTeams: TournamentGroupTeam[] = groupTeamsRaw.map(team => ({
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      }));

      // Generate round robin fixtures (3 matchdays)
      // T0 vs T1, T2 vs T3 (MD1)
      // T0 vs T2, T1 vs T3 (MD2)
      // T0 vs T3, T1 vs T2 (MD3)
      const fixtures = [
        { matchday: 1, homeTeamId: groupTeamsRaw[0].id, awayTeamId: groupTeamsRaw[1].id, played: false },
        { matchday: 1, homeTeamId: groupTeamsRaw[2].id, awayTeamId: groupTeamsRaw[3].id, played: false },
        { matchday: 2, homeTeamId: groupTeamsRaw[0].id, awayTeamId: groupTeamsRaw[2].id, played: false },
        { matchday: 2, homeTeamId: groupTeamsRaw[1].id, awayTeamId: groupTeamsRaw[3].id, played: false },
        { matchday: 3, homeTeamId: groupTeamsRaw[0].id, awayTeamId: groupTeamsRaw[3].id, played: false },
        { matchday: 3, homeTeamId: groupTeamsRaw[1].id, awayTeamId: groupTeamsRaw[2].id, played: false },
      ];

      groups.push({
        id: `group-${g}`,
        name: groupNames[g],
        teams: groupTeams,
        fixtures,
      });
    }

    return {
      id: `rcl-cup-${Date.now()}`,
      name: 'RCL CUP 2026',
      format: 'standard_32',
      userTeam,
      currentStage: 'group_stage',
      currentMatchday: 1,
      groups,
      knockoutMatches: [],
      isCompleted: false,
    };
  } else {
    // 16-team knockout mode
    const selectedOpponents = shuffled.slice(0, 15).map(c => clubToMatchTeam(c));
    const all16 = [userTeam, ...selectedOpponents];
    const r16Matches: KnockoutMatch[] = [];

    for (let i = 0; i < 8; i++) {
      r16Matches.push({
        id: `r16-${i}`,
        stage: 'round_of_16',
        stageName: 'Round of 16',
        homeTeam: all16[i * 2],
        awayTeam: all16[i * 2 + 1],
        played: false,
      });
    }

    return {
      id: `rcl-cup-ko-${Date.now()}`,
      name: 'RCL CUP KNOCKOUT',
      format: 'knockout_16',
      userTeam,
      currentStage: 'round_of_16',
      currentMatchday: 1,
      groups: [],
      knockoutMatches: r16Matches,
      isCompleted: false,
    };
  }
}

// Update group standings from match result
export function recordGroupMatchResult(
  group: TournamentGroup,
  matchday: number,
  homeTeamId: string,
  awayTeamId: string,
  result: MatchSimulationResult
): TournamentGroup {
  const newFixtures = group.fixtures.map(f => {
    if (f.matchday === matchday && f.homeTeamId === homeTeamId && f.awayTeamId === awayTeamId) {
      return { ...f, result, played: true };
    }
    return f;
  });

  const newTeams = group.teams.map(t => {
    const isHome = t.team.id === homeTeamId;
    const isAway = t.team.id === awayTeamId;
    if (!isHome && !isAway) return t;

    const gf = isHome ? result.homeScore : result.awayScore;
    const ga = isHome ? result.awayScore : result.homeScore;
    const won = gf > ga ? 1 : 0;
    const drawn = gf === ga ? 1 : 0;
    const lost = gf < ga ? 1 : 0;
    const pts = won * 3 + drawn * 1;

    return {
      ...t,
      played: t.played + 1,
      won: t.won + won,
      drawn: t.drawn + drawn,
      lost: t.lost + lost,
      goalsFor: t.goalsFor + gf,
      goalsAgainst: t.goalsAgainst + ga,
      goalDifference: t.goalDifference + (gf - ga),
      points: t.points + pts,
    };
  });

  // Sort teams by points, then goal difference, then goals scored
  newTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return {
    ...group,
    teams: newTeams,
    fixtures: newFixtures,
  };
}

// Generate Round of 16 matches when group stage ends
export function buildRoundOf16FromGroups(groups: TournamentGroup[]): KnockoutMatch[] {
  // A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2, E1 vs F2, F1 vs E2, G1 vs H2, H1 vs G2
  const matches: KnockoutMatch[] = [];
  const pairings = [
    { hGroup: 0, hPos: 0, aGroup: 1, aPos: 1 }, // A1 vs B2
    { hGroup: 2, hPos: 0, aGroup: 3, aPos: 1 }, // C1 vs D2
    { hGroup: 4, hPos: 0, aGroup: 5, aPos: 1 }, // E1 vs F2
    { hGroup: 6, hPos: 0, aGroup: 7, aPos: 1 }, // G1 vs H2
    { hGroup: 1, hPos: 0, aGroup: 0, aPos: 1 }, // B1 vs A2
    { hGroup: 3, hPos: 0, aGroup: 2, aPos: 1 }, // D1 vs C2
    { hGroup: 5, hPos: 0, aGroup: 4, aPos: 1 }, // F1 vs E2
    { hGroup: 7, hPos: 0, aGroup: 6, aPos: 1 }, // H1 vs G2
  ];

  pairings.forEach((pair, idx) => {
    const home = groups[pair.hGroup]?.teams[pair.hPos]?.team || null;
    const away = groups[pair.aGroup]?.teams[pair.aPos]?.team || null;
    matches.push({
      id: `r16-${idx}`,
      stage: 'round_of_16',
      stageName: 'Round of 16',
      homeTeam: home,
      awayTeam: away,
      played: false,
    });
  });

  return matches;
}

// Build next knockout round from previous round winners
export function buildNextKnockoutStage(
  prevMatches: KnockoutMatch[],
  nextStage: 'quarter_final' | 'semi_final' | 'final',
  stageName: string
): KnockoutMatch[] {
  const nextMatches: KnockoutMatch[] = [];
  const winners: (MatchTeamInfo | null)[] = prevMatches.map(m => {
    if (!m.result || !m.homeTeam || !m.awayTeam) return null;
    return m.result.winnerId === m.homeTeam.id ? m.homeTeam : m.awayTeam;
  });

  for (let i = 0; i < winners.length; i += 2) {
    nextMatches.push({
      id: `${nextStage}-${Math.floor(i / 2)}`,
      stage: nextStage,
      stageName,
      homeTeam: winners[i] || null,
      awayTeam: winners[i + 1] || null,
      played: false,
    });
  }

  return nextMatches;
}

// Simulate all non-user AI matches in background
export function simulateAiFixtures(
  group: TournamentGroup,
  matchday: number,
  userId: string
): TournamentGroup {
  let updatedGroup = { ...group };
  for (const fix of updatedGroup.fixtures) {
    if (fix.matchday === matchday && !fix.played) {
      if (fix.homeTeamId !== userId && fix.awayTeamId !== userId) {
        const home = updatedGroup.teams.find(t => t.team.id === fix.homeTeamId)?.team;
        const away = updatedGroup.teams.find(t => t.team.id === fix.awayTeamId)?.team;
        if (home && away) {
          const res = simulateMatch(home, away, false);
          updatedGroup = recordGroupMatchResult(updatedGroup, matchday, fix.homeTeamId, fix.awayTeamId, res);
        }
      }
    }
  }
  return updatedGroup;
}
