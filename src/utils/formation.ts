import { FormationConfig, FormationType, Player, Position, PositionCategory, TeamAnalytics, TeamTactics } from '../types/game';

export const FORMATIONS: Record<FormationType, FormationConfig> = {
  '4-3-3': {
    type: '4-3-3',
    name: '4-3-3 Attack',
    description: 'Dynamic wide attacking system with inverted wingers and a fluid midfield trio.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lb', label: 'LB', position: 'LB', category: 'DEF', x: 18, y: 72 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 38, y: 74 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 62, y: 74 },
      { id: 'rb', label: 'RB', position: 'RB', category: 'DEF', x: 82, y: 72 },
      { id: 'cdm', label: 'CDM', position: 'CDM', category: 'MID', x: 50, y: 55 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 32, y: 44 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 68, y: 44 },
      { id: 'lw', label: 'LW', position: 'LW', category: 'ATT', x: 20, y: 22 },
      { id: 'st', label: 'ST', position: 'ST', category: 'ATT', x: 50, y: 16 },
      { id: 'rw', label: 'RW', position: 'RW', category: 'ATT', x: 80, y: 22 },
    ],
  },
  '4-4-2': {
    type: '4-4-2',
    name: '4-4-2 Classic',
    description: 'Disciplined twin-striker structure with robust bank of four midfielders.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lb', label: 'LB', position: 'LB', category: 'DEF', x: 18, y: 72 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 38, y: 74 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 62, y: 74 },
      { id: 'rb', label: 'RB', position: 'RB', category: 'DEF', x: 82, y: 72 },
      { id: 'lm', label: 'LM', position: 'LM', category: 'MID', x: 18, y: 46 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 38, y: 48 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 62, y: 48 },
      { id: 'rm', label: 'RM', position: 'RM', category: 'MID', x: 82, y: 46 },
      { id: 'lst', label: 'ST', position: 'ST', category: 'ATT', x: 36, y: 20 },
      { id: 'rst', label: 'ST', position: 'ST', category: 'ATT', x: 64, y: 20 },
    ],
  },
  '4-2-3-1': {
    type: '4-2-3-1',
    name: '4-2-3-1 Wide',
    description: 'Double pivot stability with a creative number 10 directing attacks.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lb', label: 'LB', position: 'LB', category: 'DEF', x: 18, y: 72 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 38, y: 74 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 62, y: 74 },
      { id: 'rb', label: 'RB', position: 'RB', category: 'DEF', x: 82, y: 72 },
      { id: 'ldm', label: 'CDM', position: 'CDM', category: 'MID', x: 36, y: 56 },
      { id: 'rdm', label: 'CDM', position: 'CDM', category: 'MID', x: 64, y: 56 },
      { id: 'lam', label: 'LM', position: 'LM', category: 'MID', x: 22, y: 34 },
      { id: 'cam', label: 'CAM', position: 'CAM', category: 'MID', x: 50, y: 36 },
      { id: 'ram', label: 'RM', position: 'RM', category: 'MID', x: 78, y: 34 },
      { id: 'st', label: 'ST', position: 'ST', category: 'ATT', x: 50, y: 16 },
    ],
  },
  '3-5-2': {
    type: '3-5-2',
    name: '3-5-2 Wing-Back',
    description: 'Three commanding center-backs with galloping wing-backs controlling the flanks.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 28, y: 74 },
      { id: 'ccb', label: 'CB', position: 'CB', category: 'DEF', x: 50, y: 76 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 72, y: 74 },
      { id: 'lwb', label: 'LWB', position: 'LWB', category: 'DEF', x: 14, y: 50 },
      { id: 'cdm', label: 'CDM', position: 'CDM', category: 'MID', x: 50, y: 54 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 35, y: 42 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 65, y: 42 },
      { id: 'rwb', label: 'RWB', position: 'RWB', category: 'DEF', x: 86, y: 50 },
      { id: 'lst', label: 'ST', position: 'ST', category: 'ATT', x: 36, y: 18 },
      { id: 'rst', label: 'ST', position: 'ST', category: 'ATT', x: 64, y: 18 },
    ],
  },
  '3-4-3': {
    type: '3-4-3',
    name: '3-4-3 Diamond',
    description: 'High-octane total football with overload along the flanks and front trio.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 28, y: 75 },
      { id: 'ccb', label: 'CB', position: 'CB', category: 'DEF', x: 50, y: 77 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 72, y: 75 },
      { id: 'lm', label: 'LM', position: 'LM', category: 'MID', x: 18, y: 48 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 40, y: 50 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 60, y: 50 },
      { id: 'rm', label: 'RM', position: 'RM', category: 'MID', x: 82, y: 48 },
      { id: 'lw', label: 'LW', position: 'LW', category: 'ATT', x: 22, y: 22 },
      { id: 'st', label: 'ST', position: 'ST', category: 'ATT', x: 50, y: 16 },
      { id: 'rw', label: 'RW', position: 'RW', category: 'ATT', x: 78, y: 22 },
    ],
  },
  '4-1-4-1': {
    type: '4-1-4-1',
    name: '4-1-4-1 Controlled',
    description: 'Deep defensive midfield anchor with aggressive line of four supporting solitary striker.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lb', label: 'LB', position: 'LB', category: 'DEF', x: 18, y: 72 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 38, y: 74 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 62, y: 74 },
      { id: 'rb', label: 'RB', position: 'RB', category: 'DEF', x: 82, y: 72 },
      { id: 'cdm', label: 'CDM', position: 'CDM', category: 'MID', x: 50, y: 60 },
      { id: 'lm', label: 'LM', position: 'LM', category: 'MID', x: 18, y: 40 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 38, y: 42 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 62, y: 42 },
      { id: 'rm', label: 'RM', position: 'RM', category: 'MID', x: 82, y: 40 },
      { id: 'st', label: 'ST', position: 'ST', category: 'ATT', x: 50, y: 18 },
    ],
  },
  '5-3-2': {
    type: '5-3-2',
    name: '5-3-2 Counter',
    description: 'Impenetrable defensive low-block designed for swift and deadly counter-attacks.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lwb', label: 'LWB', position: 'LWB', category: 'DEF', x: 14, y: 68 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 32, y: 76 },
      { id: 'ccb', label: 'CB', position: 'CB', category: 'DEF', x: 50, y: 78 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 68, y: 76 },
      { id: 'rwb', label: 'RWB', position: 'RWB', category: 'DEF', x: 86, y: 68 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 30, y: 46 },
      { id: 'cdm', label: 'CDM', position: 'CDM', category: 'MID', x: 50, y: 52 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 70, y: 46 },
      { id: 'lst', label: 'ST', position: 'ST', category: 'ATT', x: 38, y: 20 },
      { id: 'rst', label: 'ST', position: 'ST', category: 'ATT', x: 62, y: 20 },
    ],
  },
  '4-3-1-2': {
    type: '4-3-1-2',
    name: '4-3-1-2 Narrow Diamond',
    description: 'Midfield dominance through the center with an orchestrating playmaker behind two forwards.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lb', label: 'LB', position: 'LB', category: 'DEF', x: 18, y: 72 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 38, y: 74 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 62, y: 74 },
      { id: 'rb', label: 'RB', position: 'RB', category: 'DEF', x: 82, y: 72 },
      { id: 'cdm', label: 'CDM', position: 'CDM', category: 'MID', x: 50, y: 56 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 32, y: 48 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 68, y: 48 },
      { id: 'cam', label: 'CAM', position: 'CAM', category: 'MID', x: 50, y: 34 },
      { id: 'lst', label: 'ST', position: 'ST', category: 'ATT', x: 36, y: 18 },
      { id: 'rst', label: 'ST', position: 'ST', category: 'ATT', x: 64, y: 18 },
    ],
  },
  '3-4-2-1': {
    type: '3-4-2-1',
    name: '3-4-2-1 Dual Inside Forwards',
    description: 'Modern European system featuring two roaming number 10s supporting a central striker.',
    slots: [
      { id: 'gk', label: 'GK', position: 'GK', category: 'GK', x: 50, y: 88 },
      { id: 'lcb', label: 'CB', position: 'CB', category: 'DEF', x: 28, y: 76 },
      { id: 'ccb', label: 'CB', position: 'CB', category: 'DEF', x: 50, y: 78 },
      { id: 'rcb', label: 'CB', position: 'CB', category: 'DEF', x: 72, y: 76 },
      { id: 'lm', label: 'LM', position: 'LM', category: 'MID', x: 16, y: 52 },
      { id: 'lcm', label: 'CM', position: 'CM', category: 'MID', x: 38, y: 54 },
      { id: 'rcm', label: 'CM', position: 'CM', category: 'MID', x: 62, y: 54 },
      { id: 'rm', label: 'RM', position: 'RM', category: 'MID', x: 84, y: 52 },
      { id: 'lcam', label: 'CAM', position: 'CAM', category: 'MID', x: 35, y: 30 },
      { id: 'rcam', label: 'CAM', position: 'CAM', category: 'MID', x: 65, y: 30 },
      { id: 'st', label: 'ST', position: 'ST', category: 'ATT', x: 50, y: 16 },
    ],
  },
};

// Check positional compatibility score between player and pitch slot: 0.0 - 1.0
export function getPositionalCompatibility(player: Player, slotPosition: Position): {
  score: number;
  level: 'exact' | 'good' | 'fair' | 'poor';
  effectiveRating: number;
} {
  if (player.primaryPosition === slotPosition) {
    return { score: 1.0, level: 'exact', effectiveRating: player.overall };
  }

  // Goalkeeper strict check
  if (slotPosition === 'GK') {
    if (player.primaryPosition !== 'GK') {
      return { score: 0.25, level: 'poor', effectiveRating: Math.round(player.overall * 0.4) };
    }
  }
  if (player.primaryPosition === 'GK' && slotPosition !== 'GK') {
    return { score: 0.2, level: 'poor', effectiveRating: Math.round(player.overall * 0.35) };
  }

  // Secondary positions match
  if (player.secondaryPositions && player.secondaryPositions.includes(slotPosition)) {
    return { score: 0.92, level: 'good', effectiveRating: Math.round(player.overall * 0.95) };
  }

  // Natural tactical alternates
  const naturalAlternates: Record<string, Position[]> = {
    'CB': ['LB', 'RB', 'CDM'],
    'LB': ['LWB', 'CB', 'LM'],
    'RB': ['RWB', 'CB', 'RM'],
    'LWB': ['LB', 'LM', 'LW'],
    'RWB': ['RB', 'RM', 'RW'],
    'CDM': ['CM', 'CB'],
    'CM': ['CDM', 'CAM', 'LM', 'RM'],
    'CAM': ['CM', 'LW', 'RW', 'CF', 'ST'],
    'LM': ['LW', 'LWB', 'CM'],
    'RM': ['RW', 'RWB', 'CM'],
    'LW': ['LM', 'RW', 'ST', 'CF'],
    'RW': ['RM', 'LW', 'ST', 'CF'],
    'ST': ['CF', 'LW', 'RW', 'CAM'],
    'CF': ['ST', 'CAM', 'LW', 'RW'],
  };

  const alternates = naturalAlternates[player.primaryPosition] || [];
  if (alternates.includes(slotPosition)) {
    return { score: 0.82, level: 'fair', effectiveRating: Math.round(player.overall * 0.88) };
  }

  // Out of position
  return { score: 0.5, level: 'poor', effectiveRating: Math.round(player.overall * 0.65) };
}

// Compute Team Analytics
export function calculateTeamAnalytics(
  startingXI: Record<string, Player | null>,
  formationType: FormationType,
  tactics: TeamTactics,
  benchPoolCount: number
): TeamAnalytics {
  const formation = FORMATIONS[formationType];
  const placedPlayers: { player: Player; slotPos: Position; effectiveRating: number }[] = [];

  let filledCount = 0;
  formation.slots.forEach(slot => {
    const player = startingXI[slot.id];
    if (player) {
      filledCount++;
      const comp = getPositionalCompatibility(player, slot.position);
      placedPlayers.push({
        player,
        slotPos: slot.position,
        effectiveRating: comp.effectiveRating,
      });
    }
  });

  if (placedPlayers.length === 0) {
    return {
      overallRating: 60,
      scoringRating: 60,
      stoppingRating: 60,
      teamworkRating: 50,
      formationCompatibility: 50,
      cardScore: 0,
      positionCoverage: 0,
      squadDepth: benchPoolCount,
    };
  }

  // Attack score (Shooting, Pace, Dribbling from attackers & attacking mids)
  const attackValues = placedPlayers.map(p => {
    const weight = ['ATT', 'CF', 'ST', 'LW', 'RW', 'CAM'].includes(p.slotPos) ? 1.5 : 0.8;
    return (p.player.shooting * 0.45 + p.player.pace * 0.3 + p.player.dribbling * 0.25) * weight;
  });
  const avgAttack = Math.round(attackValues.reduce((a, b) => a + b, 0) / placedPlayers.length * (tactics.mentality === 'Attacking' ? 1.05 : tactics.mentality === 'Defensive' ? 0.95 : 1.0));

  // Stopping score (Defending, Physical, Goalkeeping)
  const defValues = placedPlayers.map(p => {
    if (p.slotPos === 'GK') return p.player.goalkeeping * 1.5;
    const isDef = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM'].includes(p.slotPos);
    const weight = isDef ? 1.4 : 0.7;
    return (p.player.defending * 0.5 + p.player.physical * 0.35 + p.player.tacticalIQ * 0.15) * weight;
  });
  const avgDef = Math.round(defValues.reduce((a, b) => a + b, 0) / placedPlayers.length * (tactics.mentality === 'Defensive' ? 1.05 : tactics.mentality === 'Attacking' ? 0.95 : 1.0));

  // Teamwork & Chemistry (Club synergies, nationality synergies, tacticalIQ)
  let clubSynergyBonus = 0;
  const clubCounts: Record<string, number> = {};
  const nationCounts: Record<string, number> = {};
  placedPlayers.forEach(p => {
    clubCounts[p.player.clubName] = (clubCounts[p.player.clubName] || 0) + 1;
    nationCounts[p.player.nationality] = (nationCounts[p.player.nationality] || 0) + 1;
  });

  Object.values(clubCounts).forEach(cnt => {
    if (cnt >= 3) clubSynergyBonus += cnt * 2;
  });
  Object.values(nationCounts).forEach(cnt => {
    if (cnt >= 2) clubSynergyBonus += cnt * 1.2;
  });

  const avgIQ = placedPlayers.reduce((sum, p) => sum + p.player.tacticalIQ, 0) / placedPlayers.length;
  const teamworkRating = Math.min(99, Math.round(avgIQ * 0.7 + Math.min(25, clubSynergyBonus)));

  // Compatibility percentage
  const compScores = placedPlayers.map(p => getPositionalCompatibility(p.player, p.slotPos).score);
  const avgCompScore = (compScores.reduce((a, b) => a + b, 0) / (formation.slots.length)) * 100;
  const formationCompatibility = Math.round(avgCompScore);

  // Overall effective team rating
  const avgEffectiveRating = placedPlayers.reduce((a, b) => a + b.effectiveRating, 0) / placedPlayers.length;
  const penaltyForEmptySlots = (11 - filledCount) * 3;
  const overallRating = Math.max(50, Math.min(99, Math.round(avgEffectiveRating - penaltyForEmptySlots)));

  // Card Score (Sum of player card values + bonuses)
  const cardScore = placedPlayers.reduce((sum, p) => sum + p.player.overall * 10, 0) + Math.round(teamworkRating * 5);

  return {
    overallRating,
    scoringRating: Math.min(99, Math.max(55, avgAttack)),
    stoppingRating: Math.min(99, Math.max(55, avgDef)),
    teamworkRating,
    formationCompatibility,
    cardScore,
    positionCoverage: Math.round((filledCount / 11) * 100),
    squadDepth: benchPoolCount,
  };
}
