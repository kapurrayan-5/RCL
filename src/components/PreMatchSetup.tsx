import React from 'react';
import { FormationType, GameDifficulty, TeamTactics } from '../types/game';
import { FORMATIONS } from '../utils/formation';
import { sound } from '../utils/sound';
import { Shield, Sparkles, Sliders, ChevronRight, Check } from 'lucide-react';

interface PreMatchSetupProps {
  difficulty: GameDifficulty;
  onChangeDifficulty: (difficulty: GameDifficulty) => void;
  formation: FormationType;
  onChangeFormation: (formation: FormationType) => void;
  tactics: TeamTactics;
  onChangeTactics: (tactics: TeamTactics) => void;
  onProceedToScouting: () => void;
}

export const PreMatchSetup: React.FC<PreMatchSetupProps> = ({
  difficulty,
  onChangeDifficulty,
  formation,
  onChangeFormation,
  tactics,
  onChangeTactics,
  onProceedToScouting,
}) => {
  const currentConfig = FORMATIONS[formation];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>STEP 1 OF 4 · TACTICAL BLUEPRINT</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Pre-Match Setup & Tactical Configuration
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Establish your tactical baseline, formation layout, and squad philosophy before recruiting footballers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 bg-[#0b111c] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          {/* 1. Choose Experience / Difficulty Level */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Experience & Difficulty Tier
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onChangeDifficulty('Standard');
                  sound.playCardSelect();
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  difficulty === 'Standard'
                    ? 'bg-red-950/30 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Standard</span>
                  {difficulty === 'Standard' && <Check className="w-4 h-4 text-red-500" />}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Balanced gameplay with forgiving chemistry and standard opponent match difficulty.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeDifficulty('Advanced');
                  sound.playCardSelect();
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  difficulty === 'Advanced'
                    ? 'bg-amber-950/30 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Advanced</span>
                  {difficulty === 'Advanced' && <Check className="w-4 h-4 text-amber-500" />}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Strict tactical chemistry, rigorous defensive counters, and elite legendary AI managers.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Select Formation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Select Tactical Formation
              </label>
              <span className="text-xs text-amber-400 font-athletic font-bold">{formation}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.keys(FORMATIONS).map((fKey) => (
                <button
                  key={fKey}
                  type="button"
                  onClick={() => {
                    onChangeFormation(fKey as FormationType);
                    sound.playCardSelect();
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold font-athletic text-center transition-all cursor-pointer ${
                    formation === fKey
                      ? 'bg-red-600 border-red-500 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {fKey}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 italic">
              {currentConfig.description}
            </p>
          </div>

          {/* 3. Set Playing Style & Mentality */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              3. Playing Style & Overall Mentality
            </label>

            {/* Build-up preference */}
            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-2">Build-up Preferences</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Direct', 'Balanced', 'Possession', 'Counter'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      onChangeTactics({ ...tactics, buildup: style });
                      sound.playCardSelect();
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                      tactics.buildup === style
                        ? 'bg-slate-800 border-red-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Overall philosophy */}
            <div>
              <span className="block text-xs font-semibold text-slate-400 mb-2">Overall Philosophy / Mentality</span>
              <div className="grid grid-cols-3 gap-2">
                {(['Defensive', 'Balanced', 'Attacking'] as const).map((ment) => (
                  <button
                    key={ment}
                    type="button"
                    onClick={() => {
                      onChangeTactics({ ...tactics, mentality: ment });
                      sound.playCardSelect();
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      tactics.mentality === ment
                        ? ment === 'Attacking'
                          ? 'bg-red-600 border-red-500 text-white shadow'
                          : ment === 'Defensive'
                          ? 'bg-sky-600 border-sky-500 text-white shadow'
                          : 'bg-emerald-600 border-emerald-500 text-white shadow'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ment}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => {
              sound.playWhistle();
              onProceedToScouting();
            }}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black tracking-wider text-sm rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
          >
            <span>CONFIRM TACTICS & START SCOUTING</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Pitch Preview Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0b111c] border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold uppercase tracking-wider">Tactical Pitch Preview</span>
              <span className="font-athletic text-amber-400 font-bold">{currentConfig.name}</span>
            </div>

            {/* Pitch layout representation */}
            <div className="relative w-full aspect-[4/3] rounded-2xl tactical-pitch border-2 border-[#1f5f33] overflow-hidden shadow-inner">
              {/* Pitch markings */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/40" fill="none" strokeWidth="2">
                <rect x="3%" y="3%" width="94%" height="94%" />
                <line x1="3%" y1="50%" x2="97%" y2="50%" />
                <circle cx="50%" cy="50%" r="14%" />
                <rect x="25%" y="3%" width="50%" height="18%" />
                <rect x="25%" y="79%" width="50%" height="18%" />
              </svg>

              {/* Slot indicators */}
              {currentConfig.slots.map((slot) => (
                <div
                  key={slot.id}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 border border-white/60 flex items-center justify-center shadow"
                >
                  <span className="font-athletic font-bold text-[10px] text-white">
                    {slot.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <div>Build-up: <strong className="text-white">{tactics.buildup}</strong></div>
              <div>Mentality: <strong className="text-white">{tactics.mentality}</strong></div>
              <div>Tier: <strong className="text-white">{difficulty}</strong></div>
              <div>Target Squad: <strong className="text-white">11 Players</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
