import React, { useState, useEffect } from 'react';
import { KnockoutMatch, MatchSimulationResult, MatchTeamInfo, SimulationPacing, TournamentGroup, TournamentState } from '../types/game';
import { simulateMatch } from '../utils/simulation';
import { sound } from '../utils/sound';
import { Play, Pause, FastForward, SkipForward, Trophy, Swords, Calendar, CheckCircle2, Shield, Flame } from 'lucide-react';

interface LiveCupViewProps {
  tournament: TournamentState;
  onUpdateTournament: (tournament: TournamentState) => void;
  onCampaignComplete: (finish: any, groups: any[], knockoutMatches: KnockoutMatch[]) => void;
  userTeam: MatchTeamInfo;
}

export const LiveCupView: React.FC<LiveCupViewProps> = ({
  tournament,
  onUpdateTournament,
  onCampaignComplete,
  userTeam,
}) => {
  // Pacing and speed configurations
  const [pacingMode, setPacingMode] = useState<SimulationPacing>('by_match');
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast' | 'ultra'>('normal');
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(false);
  const [activeSimulationResult, setActiveSimulationResult] = useState<MatchSimulationResult | null>(null);

  // Live minute counter for active match simulation
  const [liveMinute, setLiveMinute] = useState<number>(0);

  const speedIntervals = {
    slow: 320,
    normal: 160,
    fast: 60,
    ultra: 0,
  };

  // Find next unplayed match involving the user
  const userTeamId = userTeam.id;

  // Derive next fixture
  let nextUserMatchInfo: { home: MatchTeamInfo; away: MatchTeamInfo; stageTitle: string; isKnockout: boolean } | null = null;

  if (tournament.currentStage === 'group_stage') {
    const userGroup = tournament.groups.find(g => g.teams.some(t => t.team.id === userTeamId));
    if (userGroup) {
      const fix = userGroup.fixtures.find(f => f.matchday === tournament.currentMatchday && !f.played);
      if (fix) {
        const home = userGroup.teams.find(t => t.team.id === fix.homeTeamId)?.team;
        const away = userGroup.teams.find(t => t.team.id === fix.awayTeamId)?.team;
        if (home && away) {
          nextUserMatchInfo = {
            home: home.isUser ? userTeam : home,
            away: away.isUser ? userTeam : away,
            stageTitle: `Group Stage · Matchday ${tournament.currentMatchday}`,
            isKnockout: false,
          };
        }
      }
    }
  } else {
    const koMatch = tournament.knockoutMatches.find(m => 
      !m.played && m.homeTeam && m.awayTeam && (m.homeTeam.id === userTeamId || m.awayTeam.id === userTeamId)
    );
    if (koMatch && koMatch.homeTeam && koMatch.awayTeam) {
      nextUserMatchInfo = {
        home: koMatch.homeTeam.isUser ? userTeam : koMatch.homeTeam,
        away: koMatch.awayTeam.isUser ? userTeam : koMatch.awayTeam,
        stageTitle: koMatch.stageName,
        isKnockout: true,
      };
    }
  }

  // Launch the match simulation
  const handleStartMatchSimulation = () => {
    if (!nextUserMatchInfo) return;
    const simResult = simulateMatch(nextUserMatchInfo.home, nextUserMatchInfo.away, nextUserMatchInfo.isKnockout);
    setActiveSimulationResult(simResult);
    setIsSimulatingLive(true);
    setLiveMinute(0);
    sound.playWhistle();

    // If ultra mode, immediately complete
    if (speed === 'ultra') {
      setLiveMinute(simResult.wentToExtraTime ? 120 : 90);
    }
  };

  // Minute-by-minute simulation ticker
  useEffect(() => {
    if (!isSimulatingLive || !activeSimulationResult) return;
    const maxMins = activeSimulationResult.wentToExtraTime ? 120 : 90;

    if (speed === 'ultra' || liveMinute >= maxMins) {
      setLiveMinute(maxMins);
      return;
    }

    const timer = setInterval(() => {
      setLiveMinute(prev => {
        const nextMin = prev + 1;
        const events = activeSimulationResult.events.filter(e => e.minute === nextMin);
        if (events.length > 0) {
          events.forEach(ev => {
            if (ev.type === 'goal') sound.playGoalCelebration();
            else if (ev.type === 'half_time' || ev.type === 'full_time') sound.playWhistle();
          });
        }
        if (nextMin >= maxMins) {
          sound.playWhistle(true);
          return maxMins;
        }
        return nextMin;
      });
    }, speedIntervals[speed]);

    return () => clearInterval(timer);
  }, [isSimulatingLive, activeSimulationResult, liveMinute, speed]);

  // Handle post-match resolution and tournament progression
  const handleConcludeMatch = () => {
    if (!activeSimulationResult) return;
    const result = activeSimulationResult;
    setIsSimulatingLive(false);
    setActiveSimulationResult(null);

    if (tournament.currentStage === 'group_stage') {
      let updatedGroups = tournament.groups.map(group => {
        if (group.teams.some(t => t.team.id === userTeamId)) {
          // Record user result
          const newFixtures = group.fixtures.map(f => {
            if (f.matchday === tournament.currentMatchday && f.homeTeamId === result.homeTeam.id && f.awayTeamId === result.awayTeam.id) {
              return { ...f, result, played: true };
            }
            return f;
          });

          // Update user group standings
          const newTeams = group.teams.map(t => {
            const isHome = t.team.id === result.homeTeam.id;
            const isAway = t.team.id === result.awayTeam.id;
            if (!isHome && !isAway) return t;

            const gf = isHome ? result.homeScore : result.awayScore;
            const ga = isHome ? result.awayScore : result.homeScore;
            const won = gf > ga ? 1 : 0;
            const drawn = gf === ga ? 1 : 0;
            const lost = gf < ga ? 1 : 0;

            return {
              ...t,
              played: t.played + 1,
              won: t.won + won,
              drawn: t.drawn + drawn,
              lost: t.lost + lost,
              goalsFor: t.goalsFor + gf,
              goalsAgainst: t.goalsAgainst + ga,
              goalDifference: t.goalDifference + (gf - ga),
              points: t.points + (won * 3 + drawn * 1),
            };
          });

          newTeams.sort((a, b) => b.points !== a.points ? b.points - a.points : b.goalDifference !== a.goalDifference ? b.goalDifference - a.goalDifference : b.goalsFor - a.goalsFor);

          // Simulate other fixture in user's group
          let updatedGroup = { ...group, teams: newTeams, fixtures: newFixtures };
          for (let f of updatedGroup.fixtures) {
            if (f.matchday === tournament.currentMatchday && !f.played && f.homeTeamId !== userTeamId && f.awayTeamId !== userTeamId) {
              const h = updatedGroup.teams.find(t => t.team.id === f.homeTeamId)?.team;
              const a = updatedGroup.teams.find(t => t.team.id === f.awayTeamId)?.team;
              if (h && a) {
                const aiRes = simulateMatch(h, a, false);
                f.result = aiRes;
                f.played = true;
                // update stats
                const hTeam = updatedGroup.teams.find(t => t.team.id === h.id)!;
                const aTeam = updatedGroup.teams.find(t => t.team.id === a.id)!;
                hTeam.played++; aTeam.played++;
                hTeam.goalsFor += aiRes.homeScore; hTeam.goalsAgainst += aiRes.awayScore;
                aTeam.goalsFor += aiRes.awayScore; aTeam.goalsAgainst += aiRes.homeScore;
                hTeam.goalDifference = hTeam.goalsFor - hTeam.goalsAgainst;
                aTeam.goalDifference = aTeam.goalsFor - aTeam.goalsAgainst;
                if (aiRes.homeScore > aiRes.awayScore) { hTeam.won++; hTeam.points += 3; aTeam.lost++; }
                else if (aiRes.homeScore === aiRes.awayScore) { hTeam.drawn++; hTeam.points += 1; aTeam.drawn++; aTeam.points += 1; }
                else { aTeam.won++; aTeam.points += 3; hTeam.lost++; }
              }
            }
          }
          updatedGroup.teams.sort((a, b) => b.points !== a.points ? b.points - a.points : b.goalDifference !== a.goalDifference ? b.goalDifference - a.goalDifference : b.goalsFor - a.goalsFor);
          return updatedGroup;
        } else {
          // Other groups
          return group;
        }
      });

      const nextMatchday = tournament.currentMatchday + 1;
      if (nextMatchday <= 3) {
        onUpdateTournament({
          ...tournament,
          groups: updatedGroups,
          currentMatchday: nextMatchday,
        });

        // If Automatic pacing, auto trigger next match after brief delay
        if (pacingMode === 'automatic') {
          setTimeout(() => handleStartMatchSimulation(), 600);
        }
      } else {
        // Group stage finished!
        const userGroup = updatedGroups.find(g => g.teams.some(t => t.team.id === userTeamId));
        const userRank = userGroup ? userGroup.teams.findIndex(t => t.team.id === userTeamId) : 3;

        if (userRank > 1) {
          onCampaignComplete('GROUP STAGE EXIT', updatedGroups, []);
        } else {
          // Build R16
          const r16Matches: KnockoutMatch[] = [
            { id: 'r16-1', stage: 'round_of_16', stageName: 'Round of 16', homeTeam: userTeam, awayTeam: tournament.groups[1]?.teams[1]?.team || tournament.groups[1]?.teams[0]?.team, played: false },
          ];
          onUpdateTournament({
            ...tournament,
            groups: updatedGroups,
            currentStage: 'round_of_16',
            knockoutMatches: r16Matches,
          });
        }
      }
    } else {
      // Knockout stage
      const updatedMatches = tournament.knockoutMatches.map(m => {
        if (m.homeTeam?.id === result.homeTeam.id && m.awayTeam?.id === result.awayTeam.id) {
          return { ...m, result, played: true, winnerId: result.winnerId };
        }
        return m;
      });

      const userWon = result.winnerId === userTeamId;
      if (!userWon) {
        const exitMap: Record<string, any> = {
          round_of_16: 'ROUND OF 16 EXIT',
          quarter_finals: 'QUARTER-FINALIST',
          semi_finals: 'SEMI-FINALIST',
          final: 'RUNNER-UP',
        };
        onCampaignComplete(exitMap[tournament.currentStage] || 'ROUND OF 16 EXIT', tournament.groups, updatedMatches);
        return;
      }

      if (tournament.currentStage === 'final') {
        onCampaignComplete('CHAMPION', tournament.groups, updatedMatches);
        return;
      }

      // Next knockout round
      const nextStageMap: Record<string, { next: any; title: string }> = {
        round_of_16: { next: 'quarter_finals', title: 'Quarter-Finals' },
        quarter_finals: { next: 'semi_finals', title: 'Semi-Finals' },
        semi_finals: { next: 'final', title: 'The Grand Final' },
      };

      const nextConfig = nextStageMap[tournament.currentStage];
      const nextOpponent = tournament.groups[2]?.teams[0]?.team || tournament.groups[0]?.teams[1]?.team;
      const nextMatch: KnockoutMatch = {
        id: `ko-${nextConfig.next}`,
        stage: nextConfig.next,
        stageName: nextConfig.title,
        homeTeam: userTeam,
        awayTeam: nextOpponent,
        played: false,
      };

      onUpdateTournament({
        ...tournament,
        currentStage: nextConfig.next,
        knockoutMatches: [...updatedMatches, nextMatch],
      });

      if (pacingMode === 'automatic') {
        setTimeout(() => handleStartMatchSimulation(), 600);
      }
    }
  };

  // Find user group for display
  const userGroup = tournament.groups.find(g => g.teams.some(t => t.team.id === userTeamId)) || tournament.groups[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Step 3 Header & Pacing Controls */}
      <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Trophy className="w-4 h-4" />
              <span>STEP 3 OF 4 · LIVE CUP SIMULATION (TOURNAMENT MODE)</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {nextUserMatchInfo ? nextUserMatchInfo.stageTitle : 'Stage Finished'}
            </h1>
            <p className="text-xs text-slate-400">
              {nextUserMatchInfo
                ? `${nextUserMatchInfo.home.name} vs ${nextUserMatchInfo.away.name}`
                : 'Tournament match progression in progress...'}
            </p>
          </div>

          {/* Simulation Controls: Pacing Mode & Speed */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Pacing Mode */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setPacingMode('by_match')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  pacingMode === 'by_match' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                By Match
              </button>
              <button
                type="button"
                onClick={() => setPacingMode('automatic')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  pacingMode === 'automatic' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Automatic
              </button>
            </div>

            {/* Speed Setting */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              {(['slow', 'normal', 'fast', 'ultra'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                    speed === s ? 'bg-amber-500 text-black font-extrabold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Play Button */}
            {!isSimulatingLive && nextUserMatchInfo && (
              <button
                type="button"
                onClick={handleStartMatchSimulation}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black tracking-wider text-xs rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.5)] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>SIMULATE FIXTURE</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Match Engine Simulator Area if match is active */}
      {isSimulatingLive && activeSimulationResult && (
        <div className="bg-[#0b111c] border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl space-y-6">
          {/* Live Scoreboard */}
          <div className="grid grid-cols-11 items-center gap-2 text-center border-b border-slate-800 pb-5">
            {/* Home */}
            <div className="col-span-4 flex items-center justify-end gap-3 text-right">
              <div>
                <div className="text-base sm:text-xl font-extrabold text-white truncate max-w-[180px]">
                  {activeSimulationResult.homeTeam.name}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">OVR {activeSimulationResult.homeTeam.rating}</div>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-athletic font-black text-sm text-white shrink-0 shadow"
                style={{ backgroundColor: activeSimulationResult.homeTeam.primaryColor }}
              >
                {activeSimulationResult.homeTeam.shortName}
              </div>
            </div>

            {/* Score & Minute */}
            <div className="col-span-3 flex flex-col items-center">
              <span className="font-athletic text-amber-400 font-bold text-xs uppercase mb-1">
                {liveMinute >= (activeSimulationResult.wentToExtraTime ? 120 : 90) ? 'FULL-TIME' : `${liveMinute}' LIVE`}
              </span>
              <div className="flex items-center gap-2 font-athletic text-4xl sm:text-5xl font-black text-white tabular-nums bg-black/40 px-4 py-1.5 rounded-2xl border border-white/5">
                <span>
                  {activeSimulationResult.events.filter(e => e.type === 'goal' && e.team === 'home' && e.minute <= liveMinute).length}
                </span>
                <span className="text-slate-500">:</span>
                <span>
                  {activeSimulationResult.events.filter(e => e.type === 'goal' && e.team === 'away' && e.minute <= liveMinute).length}
                </span>
              </div>
            </div>

            {/* Away */}
            <div className="col-span-4 flex items-center justify-start gap-3 text-left">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-athletic font-black text-sm text-white shrink-0 shadow"
                style={{ backgroundColor: activeSimulationResult.awayTeam.primaryColor }}
              >
                {activeSimulationResult.awayTeam.shortName}
              </div>
              <div>
                <div className="text-base sm:text-xl font-extrabold text-white truncate max-w-[180px]">
                  {activeSimulationResult.awayTeam.name}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">OVR {activeSimulationResult.awayTeam.rating}</div>
              </div>
            </div>
          </div>

          {/* Live Event Ticker (Goals, Goalscorers, Minute) */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Live Match Event Ticker
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activeSimulationResult.events
                .filter(e => e.minute <= liveMinute)
                .map((ev, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      ev.type === 'goal'
                        ? 'bg-red-950/40 border-red-500/50 text-red-200'
                        : ev.type === 'save'
                        ? 'bg-sky-950/30 border-sky-500/30 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-athletic font-bold text-amber-400 tabular-nums">{ev.minute}'</span>
                      <span className="font-bold">
                        {ev.type === 'goal' ? '⚽ GOAL!' : ev.type.toUpperCase()}
                      </span>
                      <span className="text-slate-300">{ev.description}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{ev.teamName}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Conclude Button when minute reaches end */}
          {liveMinute >= (activeSimulationResult.wentToExtraTime ? 120 : 90) ? (
            <button
              type="button"
              onClick={handleConcludeMatch}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>RECORD RESULT & UPDATE STANDINGS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLiveMinute(activeSimulationResult.wentToExtraTime ? 120 : 90)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip to End of Match</span>
            </button>
          )}
        </div>
      )}

      {/* Group Stage Final Standings Table */}
      {tournament.currentStage === 'group_stage' && userGroup && (
        <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Final Standings · {userGroup.name}</span>
            </h3>
            <span className="text-xs text-emerald-400 font-semibold">
              Matchday {tournament.currentMatchday} of 3
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Club Team</th>
                  <th className="py-2.5 px-3 text-center">W</th>
                  <th className="py-2.5 px-3 text-center">D</th>
                  <th className="py-2.5 px-3 text-center">L</th>
                  <th className="py-2.5 px-3 text-center">GD</th>
                  <th className="py-2.5 px-4 text-right">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-athletic text-sm">
                {userGroup.teams.map((item, idx) => {
                  const isUser = item.team.isUser;
                  const isAdvancing = idx < 2;

                  return (
                    <tr
                      key={item.team.id}
                      className={isUser ? 'bg-red-950/20 font-bold' : 'hover:bg-slate-900/40'}
                    >
                      <td className="py-3 px-3">
                        <span className={`inline-block w-5 h-5 rounded-full text-center text-xs leading-5 font-bold ${
                          isAdvancing ? 'bg-emerald-950 text-emerald-400' : 'text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-xs">
                        <span className={isUser ? 'text-amber-400 font-extrabold' : 'text-slate-200'}>
                          {item.team.name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300 tabular-nums">{item.won}</td>
                      <td className="py-3 px-3 text-center text-slate-300 tabular-nums">{item.drawn}</td>
                      <td className="py-3 px-3 text-center text-slate-300 tabular-nums">{item.lost}</td>
                      <td className="py-3 px-3 text-center text-slate-300 tabular-nums">
                        {item.goalDifference > 0 ? `+${item.goalDifference}` : item.goalDifference}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-white tabular-nums text-base">
                        {item.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Knockout Stage Visualizer */}
      {tournament.currentStage !== 'group_stage' && (
        <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Knockout Elimination Stage</span>
            </h3>
            <span className="text-xs text-amber-400 font-bold uppercase">
              Current: {tournament.currentStage.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tournament.knockoutMatches.map((m) => (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                  <span>{m.stageName}</span>
                  {m.played && <span className="text-emerald-400">FT</span>}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-1.5 rounded bg-black/30">
                    <span className="font-bold text-slate-200 truncate max-w-[120px]">
                      {m.homeTeam?.name ?? 'TBD'}
                    </span>
                    <span className="font-athletic font-black text-amber-400 tabular-nums">
                      {m.result?.homeScore ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-black/30">
                    <span className="font-bold text-slate-200 truncate max-w-[120px]">
                      {m.awayTeam?.name ?? 'TBD'}
                    </span>
                    <span className="font-athletic font-black text-amber-400 tabular-nums">
                      {m.result?.awayScore ?? '-'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
