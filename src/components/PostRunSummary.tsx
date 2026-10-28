import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TournamentHistoryRecord } from '../types/game';
import { sound } from '../utils/sound';
import { Trophy, Flame, RotateCcw, Award, CheckCircle, Shield, Target } from 'lucide-react';

interface PostRunSummaryProps {
  summary: TournamentHistoryRecord;
  totalTrophiesSecured: number;
  onPlayAgain: () => void;
}

export const PostRunSummary: React.FC<PostRunSummaryProps> = ({
  summary,
  totalTrophiesSecured,
  onPlayAgain,
}) => {
  const isChampion = summary.finish === 'CHAMPION';

  useEffect(() => {
    if (isChampion) {
      sound.playGoalCelebration();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#dc2626', '#10b981', '#ffffff'],
        });
      } catch (e) {
        // fallback
      }
    }
  }, [isChampion]);

  // Formatted outcome banner text
  const outcomeBannerText = isChampion
    ? 'CHAMPION — RCL CUP WINNERS'
    : summary.finish === 'RUNNER-UP'
    ? 'REACHED FINAL — RUNNER-UP'
    : summary.finish === 'SEMI-FINALIST'
    ? 'SEMI-FINALIST — TOP 4'
    : summary.finish === 'QUARTER-FINALIST'
    ? 'QUARTER-FINALIST — TOP 8'
    : summary.finish === 'ROUND OF 16 EXIT'
    ? 'ROUND OF 16 CONTENDER'
    : 'GROUP STAGE CAMPAIGN';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Step 4 Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold tracking-widest uppercase">
          <Trophy className="w-3.5 h-3.5" />
          <span>STEP 4 OF 4 · POST-RUN SUMMARY & CAMPAIGN REVIEW</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Campaign Performance Review
        </h1>
      </div>

      {/* Hero Outcome Banner */}
      <div className={`rounded-3xl p-6 md:p-8 border text-center space-y-3 shadow-2xl relative overflow-hidden ${
        isChampion
          ? 'bg-gradient-to-b from-[#2e1d08] via-[#1a1205] to-[#0d0903] border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)]'
          : 'bg-gradient-to-b from-slate-900 via-[#0d1527] to-[#070b12] border-slate-700'
      }`}>
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border ${
            isChampion
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-white'
              : 'bg-slate-800 border-slate-700 text-amber-400'
          }`}>
            <Trophy className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="font-athletic text-xs font-bold text-amber-400 uppercase tracking-widest">
            TOURNAMENT OUTCOME
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
            {outcomeBannerText}
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            {isChampion
              ? 'Unbelievable tactical triumph! Your drafted starting eleven has lifted the world-renowned RCL Cup.'
              : `A hard-fought tournament run concluding with ${summary.wins} wins across ${summary.matchesPlayed} intense knockout matches.`}
          </p>
        </div>
      </div>

      {/* Squad Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Match Record & Goal Differential */}
        <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Target className="w-4 h-4 text-red-500" />
            <span>Match Record & Goal Diff</span>
          </div>

          <div className="space-y-1">
            <div className="font-athletic text-3xl font-black text-white tabular-nums">
              {summary.wins}W · {summary.draws}D · {summary.losses}L
            </div>
            <div className="text-xs text-slate-400">
              Total Goals (Scored - Conceded):
            </div>
            <div className="font-athletic text-2xl font-black text-emerald-400 tabular-nums">
              {summary.goalsScored} - {summary.goalsConceded}
            </div>
          </div>
        </div>

        {/* Metric 2: Top Scorer */}
        <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Top Scorer</span>
          </div>

          <div className="space-y-1">
            <div className="text-lg font-black text-white truncate">
              {summary.topScorer.name}
            </div>
            <div className="text-xs text-slate-400">
              Tournament Goal Tally:
            </div>
            <div className="font-athletic text-3xl font-black text-amber-400 tabular-nums">
              {summary.topScorer.goals} Goals
            </div>
          </div>
        </div>

        {/* Metric 3: Trophies Secured */}
        <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Trophies Secured</span>
          </div>

          <div className="space-y-1">
            <div className="font-athletic text-3xl font-black text-amber-400 tabular-nums">
              {totalTrophiesSecured} {totalTrophiesSecured === 1 ? 'Cup' : 'Cups'}
            </div>
            <div className="text-xs text-slate-400">
              Cabinet Record:
            </div>
            <div className="text-xs text-emerald-400 font-bold">
              {summary.cleanSheets} Clean Sheets kept
            </div>
          </div>
        </div>
      </div>

      {/* Restart New Campaign Action */}
      <div className="text-center pt-4">
        <button
          type="button"
          onClick={() => {
            sound.playWhistle();
            onPlayAgain();
          }}
          className="px-8 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black tracking-widest text-sm rounded-2xl shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all transform active:scale-95 flex items-center justify-center gap-3 mx-auto cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>PLAY AGAIN (START NEW CAMPAIGN)</span>
        </button>
      </div>
    </div>
  );
};
