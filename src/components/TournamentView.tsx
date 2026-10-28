import React, { useState } from 'react';
import {
  KnockoutMatch,
  MatchSimulationResult,
  MatchTeamInfo,
  TournamentGroup,
  TournamentState,
} from '../types/game';
import { sound } from '../utils/sound';
import { Trophy, Swords, Calendar, Award, ChevronRight, CheckCircle2, Shield } from 'lucide-react';

interface TournamentViewProps {
  tournament: TournamentState;
  onLaunchNextMatch: () => void;
  guidedEnabled: boolean;
  onResetTournament: () => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  tournament,
  onLaunchNextMatch,
  guidedEnabled,
  onResetTournament,
}) => {
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);
  const [activeViewMode, setActiveViewMode] = useState<'groups' | 'knockout'>('groups');

  const currentGroup = tournament.groups[activeGroupIndex] || tournament.groups[0];

  // Check if user has an unplayed fixture in current stage
  const userTeamId = tournament.userTeam.id;

  let nextUserFixture: { home: MatchTeamInfo; away: MatchTeamInfo; stageTitle: string } | null = null;

  if (tournament.currentStage === 'group_stage') {
    const userGroup = tournament.groups.find(g => g.teams.some(t => t.team.id === userTeamId));
    if (userGroup) {
      const fix = userGroup.fixtures.find(f => f.matchday === tournament.currentMatchday && !f.played);
      if (fix) {
        const home = userGroup.teams.find(t => t.team.id === fix.homeTeamId)?.team;
        const away = userGroup.teams.find(t => t.team.id === fix.awayTeamId)?.team;
        if (home && away) {
          nextUserFixture = { home, away, stageTitle: `Group Stage · Matchday ${tournament.currentMatchday}` };
        }
      }
    }
  } else {
    // Knockout match for user
    const koMatch = tournament.knockoutMatches.find(m => 
      !m.played && m.homeTeam && m.awayTeam && (m.homeTeam.id === userTeamId || m.awayTeam.id === userTeamId)
    );
    if (koMatch && koMatch.homeTeam && koMatch.awayTeam) {
      nextUserFixture = { home: koMatch.homeTeam, away: koMatch.awayTeam, stageTitle: koMatch.stageName };
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Guided Banner */}
      {guidedEnabled && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-400 uppercase tracking-wider">Tournament Guide:</span>
            <span>Compete in the 32-team RCL Cup against historical club squads. Top two teams from each group qualify for the knockout phase.</span>
          </div>
        </div>
      )}

      {/* Hero Tournament Action Card */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d1527] via-[#101b33] to-[#1c0e1f] border border-slate-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 tracking-widest uppercase">
              <Trophy className="w-4 h-4" />
              <span>RCL CUP 2026 · {tournament.currentStage.replace('_', ' ').toUpperCase()}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {nextUserFixture ? nextUserFixture.stageTitle : 'Tournament Stage Complete'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              {nextUserFixture 
                ? `Upcoming Fixture: ${nextUserFixture.home.name} vs ${nextUserFixture.away.name}`
                : tournament.isCompleted
                ? `Champion: ${tournament.championTeam?.name ?? 'Determined'}`
                : 'All fixtures for current matchday concluded. Advance to next round.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {nextUserFixture && (
              <button
                onClick={() => {
                  sound.playWhistle();
                  onLaunchNextMatch();
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold tracking-wider text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>LAUNCH MATCH</span>
              </button>
            )}

            <button
              onClick={onResetTournament}
              className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors border border-slate-700"
            >
              NEW CAMPAIGN
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher: Groups vs Knockout Bracket */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveViewMode('groups')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeViewMode === 'groups' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            GROUP STAGES (A–H)
          </button>
          <button
            onClick={() => setActiveViewMode('knockout')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeViewMode === 'knockout' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            KNOCKOUT BRACKET
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Stage: <strong className="text-emerald-400 uppercase">{tournament.currentStage.replace('_', ' ')}</strong>
        </div>
      </div>

      {/* VIEW 1: Groups Standings & Fixtures */}
      {activeViewMode === 'groups' && tournament.groups.length > 0 && (
        <div className="space-y-4">
          {/* Group Tabs (A to H) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {tournament.groups.map((grp, i) => (
              <button
                key={grp.id}
                onClick={() => {
                  setActiveGroupIndex(i);
                  sound.playCardSelect();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                  activeGroupIndex === i
                    ? 'bg-slate-800 border-red-500 text-white shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {grp.name}
              </button>
            ))}
          </div>

          {/* Group Table and Fixtures Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Standings Table (7 Cols) */}
            <div className="lg:col-span-8 bg-[#0b111c] border border-slate-800 rounded-2xl p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {currentGroup.name} Standings
                </h3>
                <span className="text-[11px] text-slate-400">Top 2 Qualify for Round of 16</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-900/60">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Club Team</th>
                      <th className="py-2.5 px-2 text-center">P</th>
                      <th className="py-2.5 px-2 text-center">W</th>
                      <th className="py-2.5 px-2 text-center">D</th>
                      <th className="py-2.5 px-2 text-center">L</th>
                      <th className="py-2.5 px-2 text-center">GF</th>
                      <th className="py-2.5 px-2 text-center">GA</th>
                      <th className="py-2.5 px-2 text-center">GD</th>
                      <th className="py-2.5 px-3 text-right">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-athletic text-sm">
                    {currentGroup.teams.map((item, idx) => {
                      const isUser = item.team.isUser;
                      const isQualifying = idx < 2;

                      return (
                        <tr
                          key={item.team.id}
                          className={`transition-colors ${
                            isUser ? 'bg-red-950/20 font-bold' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className={`inline-block w-5 h-5 rounded-full text-center text-xs leading-5 font-bold ${
                              isQualifying ? 'bg-emerald-950 text-emerald-400' : 'text-slate-500'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans text-xs">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center font-athletic text-[10px] font-black text-white shrink-0"
                                style={{ backgroundColor: item.team.primaryColor }}
                              >
                                {item.team.shortName.slice(0, 3)}
                              </div>
                              <span className={`truncate max-w-[170px] ${isUser ? 'text-amber-400 font-extrabold' : 'text-slate-200'}`}>
                                {item.team.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">{item.played}</td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">{item.won}</td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">{item.drawn}</td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">{item.lost}</td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">{item.goalsFor}</td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">{item.goalsAgainst}</td>
                          <td className="py-3 px-2 text-center text-slate-300 tabular-nums">
                            {item.goalDifference > 0 ? `+${item.goalDifference}` : item.goalDifference}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-white tabular-nums text-base">
                            {item.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fixtures List (5 Cols) */}
            <div className="lg:col-span-4 bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-red-500" />
                <span>{currentGroup.name} Fixtures</span>
              </div>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {currentGroup.fixtures.map((fix, idx) => {
                  const home = currentGroup.teams.find(t => t.team.id === fix.homeTeamId)?.team;
                  const away = currentGroup.teams.find(t => t.team.id === fix.awayTeamId)?.team;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        fix.played ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-900 border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1.5">
                        <span>MATCHDAY {fix.matchday}</span>
                        {fix.played ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> FT
                          </span>
                        ) : (
                          <span className="text-amber-400">UPCOMING</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-200 truncate flex-1 text-left">
                          {home?.shortName}
                        </span>

                        <div className="font-athletic text-base font-black px-2 py-0.5 rounded bg-black/40 text-white tabular-nums">
                          {fix.result ? `${fix.result.homeScore} : ${fix.result.awayScore}` : 'vs'}
                        </div>

                        <span className="font-semibold text-slate-200 truncate flex-1 text-right">
                          {away?.shortName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Knockout Bracket Visualizer */}
      {activeViewMode === 'knockout' && (
        <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-6 overflow-x-auto space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Knockout Stage Progression
            </h3>
            <span className="text-xs text-slate-400">Single elimination with extra-time & penalties</span>
          </div>

          {tournament.knockoutMatches.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-semibold text-slate-300">Knockout Stage has not commenced yet</div>
              <p className="text-slate-500 max-w-sm mx-auto">
                Complete all 3 matchdays of the group stage to qualify the top 16 teams into the bracket.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[700px]">
              {tournament.knockoutMatches.map((m) => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                    <span>{m.stageName}</span>
                    {m.played && <span className="text-emerald-400">FT</span>}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-1.5 rounded bg-black/30">
                      <span className="font-bold text-slate-200 truncate max-w-[130px]">
                        {m.homeTeam?.name ?? 'TBD'}
                      </span>
                      <span className="font-athletic font-black text-amber-400 tabular-nums">
                        {m.result?.homeScore ?? '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded bg-black/30">
                      <span className="font-bold text-slate-200 truncate max-w-[130px]">
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
          )}
        </div>
      )}
    </div>
  );
};
