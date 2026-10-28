import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TournamentHistoryRecord } from '../types/game';
import { sound } from '../utils/sound';
import { Trophy, Award, Medal, CheckCircle, RotateCcw, Share2, Flame } from 'lucide-react';

interface CampaignSummaryModalProps {
  summary: TournamentHistoryRecord;
  onPlayAgain: () => void;
  onClose: () => void;
}

export const CampaignSummaryModal: React.FC<CampaignSummaryModalProps> = ({
  summary,
  onPlayAgain,
  onClose,
}) => {
  const isChampion = summary.finish === 'CHAMPION';

  useEffect(() => {
    if (isChampion) {
      sound.playGoalCelebration();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#dc2626', '#10b981', '#ffffff'],
        });
      } catch (e) {
        // fallback if canvas-confetti is not loaded
      }
    }
  }, [isChampion]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b111c] border border-slate-700 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6 text-center my-auto">
        {/* Trophy / Status Icon */}
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border ${
            isChampion
              ? 'bg-gradient-to-br from-amber-400 to-amber-700 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}>
            <Trophy className={`w-10 h-10 ${isChampion ? 'text-white' : 'text-amber-400'}`} />
          </div>
        </div>

        {/* Finish Title */}
        <div className="space-y-1">
          <span className="text-xs font-athletic font-bold text-amber-400 uppercase tracking-widest">
            RCL CUP 2026 CAMPAIGN SUMMARY
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
            {summary.finish}
          </h2>
          <p className="text-xs text-slate-300">
            {isChampion 
              ? 'Immortal Glory! You conquered the world’s elite club squads to lift the prestigious RCL Cup.'
              : `Your campaign concluded at the ${summary.finish.replace('_', ' ')} stage after fierce tactical battles.`}
          </p>
        </div>

        {/* Campaign Record Grid */}
        <div className="grid grid-cols-4 gap-2 bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center font-athletic">
          <div>
            <span className="block text-[10px] text-slate-400 font-sans font-medium uppercase">Matches</span>
            <span className="text-2xl font-black text-white tabular-nums">{summary.matchesPlayed}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-sans font-medium uppercase">W - D - L</span>
            <span className="text-2xl font-black text-emerald-400 tabular-nums">
              {summary.wins}-{summary.draws}-{summary.losses}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-sans font-medium uppercase">Goals</span>
            <span className="text-2xl font-black text-white tabular-nums">
              {summary.goalsScored}:{summary.goalsConceded}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-sans font-medium uppercase">Clean Sheets</span>
            <span className="text-2xl font-black text-sky-400 tabular-nums">{summary.cleanSheets}</span>
          </div>
        </div>

        {/* Individual Honors */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>TOP SCORER</span>
            </div>
            <div className="font-extrabold text-sm text-white truncate">{summary.topScorer.name}</div>
            <div className="text-xs text-slate-400 font-athletic">{summary.topScorer.goals} Tournament Goals</div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>TOP ASSISTER</span>
            </div>
            <div className="font-extrabold text-sm text-white truncate">{summary.topAssister.name}</div>
            <div className="text-xs text-slate-400 font-athletic">{summary.topAssister.assists} Key Assists</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN / NEW CAMPAIGN</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
          >
            REVIEW STATS
          </button>
        </div>
      </div>
    </div>
  );
};
