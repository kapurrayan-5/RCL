import { MatchEvent, MatchSimulationResult, MatchStats, MatchTeamInfo, Player } from '../types/game';

// Simulation Engine for RCL Matches
export function simulateMatch(
  homeTeam: MatchTeamInfo,
  awayTeam: MatchTeamInfo,
  isKnockout: boolean = false
): MatchSimulationResult {
  // 1. Calculate base team power based on ratings and tactics
  const homeAttack = calculateAttackPower(homeTeam);
  const homeDefense = calculateDefensePower(homeTeam);
  const awayAttack = calculateAttackPower(awayTeam);
  const awayDefense = calculateDefensePower(awayTeam);

  // Tactical matchup advantage
  let homeTacticalAdvantage = 0;
  if (homeTeam.tactics && awayTeam.tactics) {
    if (homeTeam.tactics.buildup === 'Counter' && awayTeam.tactics.defensiveLine === 'High') {
      homeTacticalAdvantage += 3;
    }
    if (homeTeam.tactics.pressing === 'High' && awayTeam.tactics.buildup === 'Possession') {
      homeTacticalAdvantage += 2;
    }
    if (awayTeam.tactics.buildup === 'Counter' && homeTeam.tactics.defensiveLine === 'High') {
      homeTacticalAdvantage -= 3;
    }
  }

  // Home advantage slight bump (+2 rating equivalent)
  const homeRatingEff = homeTeam.rating + 2 + homeTacticalAdvantage;
  const awayRatingEff = awayTeam.rating - homeTacticalAdvantage;

  // Expected goal lambda base
  const homeNetPower = (homeAttack - awayDefense) / 10 + (homeRatingEff - awayRatingEff) * 0.04;
  const awayNetPower = (awayAttack - homeDefense) / 10 + (awayRatingEff - homeRatingEff) * 0.04;

  const homeExpectedGoals = Math.max(0.3, Math.min(5.5, 1.5 + homeNetPower + (Math.random() * 0.4 - 0.2)));
  const awayExpectedGoals = Math.max(0.2, Math.min(5.0, 1.2 + awayNetPower + (Math.random() * 0.4 - 0.2)));

  const events: MatchEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;
  let homeSaves = 0;
  let awaySaves = 0;
  let homeCorners = Math.floor(Math.random() * 6) + 2;
  let awayCorners = Math.floor(Math.random() * 5) + 2;
  let homeFouls = Math.floor(Math.random() * 8) + 5;
  let awayFouls = Math.floor(Math.random() * 8) + 5;
  let homeXG = 0;
  let awayXG = 0;

  // Possession calculation
  const totalPlay = homeRatingEff + awayRatingEff;
  let possession = Math.round((homeRatingEff / totalPlay) * 100);
  if (homeTeam.tactics?.buildup === 'Possession') possession += 5;
  if (awayTeam.tactics?.buildup === 'Possession') possession -= 5;
  possession = Math.max(30, Math.min(70, possession));

  // Determine key minutes for events across 90 minutes
  const totalMinutes = 90;
  for (let m = 1; m <= totalMinutes; m++) {
    // Half time event
    if (m === 45) {
      events.push({
        minute: 45,
        type: 'half_time',
        team: 'home',
        teamName: homeTeam.name,
        playerName: 'Referee',
        description: `Half-Time: ${homeTeam.shortName} ${homeScore} - ${awayScore} ${awayTeam.shortName}`,
      });
    }

    // Home chance check (~15% chance of an attacking action per minute)
    if (Math.random() < 0.16) {
      const chanceValue = Math.random();
      const chanceQuality = (homeExpectedGoals / 90) * 5.2;

      if (chanceValue < chanceQuality) {
        homeShots++;
        const shotXG = Number((0.08 + Math.random() * 0.35).toFixed(2));
        homeXG += shotXG;

        const scorer = pickAttackingPlayer(homeTeam.lineup);
        const assister = pickAssistingPlayer(homeTeam.lineup, scorer.id);

        if (Math.random() < (scorer.shooting / 100) * 0.45 + (shotXG > 0.25 ? 0.2 : 0.05)) {
          // GOAL!
          homeScore++;
          homeShotsOnTarget++;
          events.push({
            minute: m,
            type: 'goal',
            team: 'home',
            teamName: homeTeam.name,
            playerName: scorer.shortName,
            assistPlayerName: assister?.shortName,
            description: assister 
              ? `GOAL! ${scorer.shortName} scores with a clinical finish after an exquisite ball from ${assister.shortName}!`
              : `GOAL! Spectacular individual strike from ${scorer.shortName} to find the back of the net!`,
          });
        } else if (Math.random() < 0.6) {
          // Saved by keeper
          homeShotsOnTarget++;
          awaySaves++;
          const gk = awayTeam.lineup.find(p => p.primaryPosition === 'GK') || awayTeam.lineup[0];
          events.push({
            minute: m,
            type: 'save',
            team: 'away',
            teamName: awayTeam.name,
            playerName: gk.shortName,
            description: `Superb reflex save by ${gk.shortName} to deny ${scorer.shortName}!`,
          });
        } else if (Math.random() < 0.12) {
          // Woodwork
          events.push({
            minute: m,
            type: 'woodwork',
            team: 'home',
            teamName: homeTeam.name,
            playerName: scorer.shortName,
            description: `Off the crossbar! Thumping effort by ${scorer.shortName} rattles the woodwork!`,
          });
        }
      }
    }

    // Away chance check
    if (Math.random() < 0.15) {
      const chanceValue = Math.random();
      const chanceQuality = (awayExpectedGoals / 90) * 5.0;

      if (chanceValue < chanceQuality) {
        awayShots++;
        const shotXG = Number((0.07 + Math.random() * 0.35).toFixed(2));
        awayXG += shotXG;

        const scorer = pickAttackingPlayer(awayTeam.lineup);
        const assister = pickAssistingPlayer(awayTeam.lineup, scorer.id);

        if (Math.random() < (scorer.shooting / 100) * 0.45 + (shotXG > 0.25 ? 0.2 : 0.05)) {
          // GOAL!
          awayScore++;
          awayShotsOnTarget++;
          events.push({
            minute: m,
            type: 'goal',
            team: 'away',
            teamName: awayTeam.name,
            playerName: scorer.shortName,
            assistPlayerName: assister?.shortName,
            description: assister 
              ? `GOAL! ${scorer.shortName} finishes emphatically from ${assister.shortName}'s low cross!`
              : `GOAL! ${scorer.shortName} unleashes a rocket into the top corner!`,
          });
        } else if (Math.random() < 0.6) {
          // Saved by keeper
          awayShotsOnTarget++;
          homeSaves++;
          const gk = homeTeam.lineup.find(p => p.primaryPosition === 'GK') || homeTeam.lineup[0];
          events.push({
            minute: m,
            type: 'save',
            team: 'home',
            teamName: homeTeam.name,
            playerName: gk.shortName,
            description: `Brilliant diving stop by ${gk.shortName} to thwart ${scorer.shortName}!`,
          });
        }
      }
    }

    // Yellow Card random chance
    if (Math.random() < 0.02) {
      const isHome = Math.random() < 0.5;
      const team = isHome ? homeTeam : awayTeam;
      const player = pickDefensivePlayer(team.lineup);
      events.push({
        minute: m,
        type: 'yellow_card',
        team: isHome ? 'home' : 'away',
        teamName: team.name,
        playerName: player.shortName,
        description: `Yellow Card shown to ${player.shortName} for a tactical foul breaking up the counter.`,
      });
    }
  }

  // Ensure minimum shots consistency
  homeShots = Math.max(homeScore, homeShots, homeShotsOnTarget + 2);
  awayShots = Math.max(awayScore, awayShots, awayShotsOnTarget + 2);
  homeShotsOnTarget = Math.max(homeScore, homeShotsOnTarget);
  awayShotsOnTarget = Math.max(awayScore, awayShotsOnTarget);

  let wentToExtraTime = false;
  let wentToPenalties = false;
  let homePenalties = 0;
  let awayPenalties = 0;
  let winnerId: string | 'draw' = homeScore > awayScore ? homeTeam.id : awayScore > homeScore ? awayTeam.id : 'draw';

  // Knockout resolution for draws
  if (isKnockout && homeScore === awayScore) {
    wentToExtraTime = true;
    // 30 min extra time simulation
    const extraTimeGoalRand = Math.random();
    if (extraTimeGoalRand < 0.3) {
      homeScore++;
      homeShots++;
      homeShotsOnTarget++;
      const scorer = pickAttackingPlayer(homeTeam.lineup);
      events.push({
        minute: 108,
        type: 'goal',
        team: 'home',
        teamName: homeTeam.name,
        playerName: scorer.shortName,
        description: `EXTRA-TIME DRAMA! ${scorer.shortName} scores a dramatic winner in the 108th minute!`,
      });
      winnerId = homeTeam.id;
    } else if (extraTimeGoalRand > 0.7) {
      awayScore++;
      awayShots++;
      awayShotsOnTarget++;
      const scorer = pickAttackingPlayer(awayTeam.lineup);
      events.push({
        minute: 114,
        type: 'goal',
        team: 'away',
        teamName: awayTeam.name,
        playerName: scorer.shortName,
        description: `EXTRA-TIME GOAL! ${scorer.shortName} breaks the deadlock in extra time!`,
      });
      winnerId = awayTeam.id;
    } else {
      // Penalty shootout
      wentToPenalties = true;
      let hp = 0;
      let ap = 0;
      for (let p = 0; p < 5; p++) {
        if (Math.random() < 0.78) hp++;
        if (Math.random() < 0.78) ap++;
      }
      // Sudden death if tied
      while (hp === ap) {
        if (Math.random() < 0.72) hp++;
        if (Math.random() < 0.72) ap++;
      }
      homePenalties = hp;
      awayPenalties = ap;
      winnerId = hp > ap ? homeTeam.id : awayTeam.id;

      events.push({
        minute: 120,
        type: 'full_time',
        team: 'home',
        teamName: homeTeam.name,
        playerName: 'Referee',
        description: `PENALTY SHOOTOUT: ${homeTeam.shortName} ${hp} - ${ap} ${awayTeam.shortName} (${hp > ap ? homeTeam.shortName : awayTeam.shortName} wins!)`,
      });
    }
  }

  // Full time whistle event
  events.push({
    minute: wentToExtraTime ? 120 : 90,
    type: 'full_time',
    team: 'home',
    teamName: homeTeam.name,
    playerName: 'Referee',
    description: `Full-Time Whistle: ${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`,
  });

  // Sort events by minute
  events.sort((a, b) => a.minute - b.minute);

  const stats: MatchStats = {
    possession,
    shots: { home: homeShots, away: awayShots },
    shotsOnTarget: { home: homeShotsOnTarget, away: awayShotsOnTarget },
    xG: { home: Number(homeXG.toFixed(2)), away: Number(awayXG.toFixed(2)) },
    passAccuracy: {
      home: Math.min(94, Math.max(76, Math.round(homeTeam.rating * 0.95 + (possession - 50) * 0.3))),
      away: Math.min(94, Math.max(76, Math.round(awayTeam.rating * 0.95 + (50 - possession) * 0.3))),
    },
    saves: { home: homeSaves, away: awaySaves },
    corners: { home: homeCorners, away: awayCorners },
    fouls: { home: homeFouls, away: awayFouls },
  };

  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homePenalties: wentToPenalties ? homePenalties : undefined,
    awayPenalties: wentToPenalties ? awayPenalties : undefined,
    wentToExtraTime,
    wentToPenalties,
    events,
    stats,
    winnerId,
  };
}

function calculateAttackPower(team: MatchTeamInfo): number {
  if (!team.lineup || team.lineup.length === 0) return team.rating;
  const forwards = team.lineup.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.primaryPosition));
  if (forwards.length === 0) return team.rating;
  const avg = forwards.reduce((acc, p) => acc + (p.shooting * 0.5 + p.pace * 0.3 + p.dribbling * 0.2), 0) / forwards.length;
  return avg;
}

function calculateDefensePower(team: MatchTeamInfo): number {
  if (!team.lineup || team.lineup.length === 0) return team.rating;
  const defenders = team.lineup.filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'GK'].includes(p.primaryPosition));
  if (defenders.length === 0) return team.rating;
  const avg = defenders.reduce((acc, p) => acc + (p.primaryPosition === 'GK' ? p.goalkeeping : p.defending * 0.6 + p.physical * 0.4), 0) / defenders.length;
  return avg;
}

function pickAttackingPlayer(lineup: Player[]): Player {
  const attackers = lineup.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(p.primaryPosition));
  const pool = attackers.length > 0 ? attackers : lineup;
  // Weighted by shooting
  const total = pool.reduce((sum, p) => sum + p.shooting, 0);
  let rand = Math.random() * total;
  for (const player of pool) {
    if (rand < player.shooting) return player;
    rand -= player.shooting;
  }
  return pool[0];
}

function pickAssistingPlayer(lineup: Player[], excludeId: string): Player | null {
  const pool = lineup.filter(p => p.id !== excludeId && p.primaryPosition !== 'GK');
  if (pool.length === 0) return null;
  // Weighted by passing
  const total = pool.reduce((sum, p) => sum + p.passing, 0);
  let rand = Math.random() * total;
  for (const player of pool) {
    if (rand < player.passing) return player;
    rand -= player.passing;
  }
  return pool[0];
}

function pickDefensivePlayer(lineup: Player[]): Player {
  const pool = lineup.filter(p => ['CB', 'LB', 'RB', 'CDM', 'CM'].includes(p.primaryPosition));
  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return lineup[Math.floor(Math.random() * lineup.length)];
}
