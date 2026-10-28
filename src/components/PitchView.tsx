import React, { useState } from 'react';
import { FormationSlot, FormationType, Player, Position, TeamAnalytics, TeamTactics } from '../types/game';
import { FORMATIONS, getPositionalCompatibility } from '../utils/formation';
import { sound } from '../utils/sound';
import { Sliders, Zap, Shield, Target, Award, Users, Trash2, ArrowRight, X } from 'lucide-react';

interface PitchViewProps {
  formation: FormationType;
  onChangeFormation: (formation: FormationType) => void;
  startingXI: Record<string, Player | null>;
  onPlacePlayerInSlot: (slotId: string, player: Player) => void;
  onRemovePlayerFromSlot: (slotId: string) => void;
  availablePlayers: Player[];
  tactics: TeamTactics;
  onChangeTactics: (tactics: TeamTactics) => void;
  analytics: TeamAnalytics;
  onAutoFill: (mode: 'best' | 'attacking' | 'defensive' | 'balanced') => void;
  onGoToPlay: () => void;
  guidedEnabled: boolean;
}

export const PitchView: React.FC<PitchViewProps> = ({
  formation,
  onChangeFormation,
  startingXI,
  onPlacePlayerInSlot,
  onRemovePlayerFromSlot,
  availablePlayers,
  tactics,
  onChangeTactics,
  analytics,
  onAutoFill,
  onGoToPlay,
  guidedEnabled,
}) => {
  const currentFormationConfig = FORMATIONS[formation];
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [tacticsDrawerOpen, setTacticsDrawerOpen] = useState<boolean>(false);

  const activeSlot = currentFormationConfig.slots.find(s => s.id === activeSlotId);

  // Filter candidates for selected slot sorted by compatibility
  const candidatePlayers = React.useMemo(() => {
    if (!activeSlot) return [];
    const alreadyPlacedIds = Object.entries(startingXI)
      .filter(([slotId, p]) => slotId !== activeSlot.id && p !== null)
      .map(([_, p]) => p!.id);

    return availablePlayers
      .filter(p => !alreadyPlacedIds.includes(p.id))
      .map(p => {
        const comp = getPositionalCompatibility(p, activeSlot.position);
        return { player: p, comp };
      })
      .sort((a, b) => b.comp.effectiveRating - a.comp.effectiveRating);
  }, [activeSlot, availablePlayers, startingXI]);

  const filledCount = Object.values(startingXI).filter(Boolean).length;
  const isLineupReady = filledCount === 11;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Guided Banner */}
      {guidedEnabled && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-400 uppercase tracking-wider">Tactical Guide:</span>
            <span>Click any slot on the pitch to deploy your footballers. Green highlights indicate high positional chemistry. Fill all 11 slots to unlock the RCL Cup.</span>
          </div>
          {isLineupReady && (
            <button
              onClick={onGoToPlay}
              className="font-bold text-emerald-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Ready for RCL Cup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Top Tactical Bar */}
      <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Formation Picker */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formation:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
            {Object.keys(FORMATIONS).map(fType => (
              <button
                key={fType}
                onClick={() => {
                  onChangeFormation(fType as FormationType);
                  sound.playCardSelect();
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  formation === fType
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {fType}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Auto-Fill Recommendations */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Auto-Deploy:</span>
          <button
            onClick={() => {
              onAutoFill('best');
              sound.playWhistle();
            }}
            className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            Best Overall
          </button>
          <button
            onClick={() => {
              onAutoFill('attacking');
              sound.playWhistle();
            }}
            className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors"
          >
            Attacking XI
          </button>
          <button
            onClick={() => {
              onAutoFill('defensive');
              sound.playWhistle();
            }}
            className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg border border-slate-700 transition-colors"
          >
            Defensive XI
          </button>
          <button
            onClick={() => {
              onAutoFill('balanced');
              sound.playWhistle();
            }}
            className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg border border-slate-700 transition-colors"
          >
            Balanced XI
          </button>
        </div>
      </div>

      {/* Main Pitch and Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tactical Pitch Canvas (7 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl tactical-pitch border-4 border-[#1f5f33] shadow-2xl overflow-hidden select-none">
            {/* Pitch Markings SVG Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/40" fill="none" strokeWidth="2">
              {/* Outer boundary padding */}
              <rect x="3%" y="3%" width="94%" height="94%" />
              {/* Halfway line */}
              <line x1="3%" y1="50%" x2="97%" y2="50%" />
              {/* Centre circle */}
              <circle cx="50%" cy="50%" r="14%" />
              <circle cx="50%" cy="50%" r="2" fill="white" className="fill-white/60" />

              {/* Top Penalty Area (Opponent) */}
              <rect x="25%" y="3%" width="50%" height="18%" />
              <rect x="37%" y="3%" width="26%" height="7%" />
              <circle cx="50%" cy="14%" r="2" fill="white" className="fill-white/60" />

              {/* Bottom Penalty Area (Home / Our Goalkeeper) */}
              <rect x="25%" y="79%" width="50%" height="18%" />
              <rect x="37%" y="90%" width="26%" height="7%" />
              <circle cx="50%" cy="86%" r="2" fill="white" className="fill-white/60" />
            </svg>

            {/* Positional Markers & Player Tokens on Pitch */}
            {currentFormationConfig.slots.map(slot => {
              const placedPlayer = startingXI[slot.id];
              const isActive = activeSlotId === slot.id;
              const comp = placedPlayer ? getPositionalCompatibility(placedPlayer, slot.position) : null;

              return (
                <div
                  key={slot.id}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onClick={() => {
                    setActiveSlotId(slot.id);
                    sound.playCardSelect();
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform duration-200 hover:scale-105"
                >
                  {placedPlayer ? (
                    // Populated Slot Token
                    <div className={`relative flex flex-col items-center group`}>
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center p-1 shadow-xl transition-all ${
                        isActive
                          ? 'border-emerald-400 ring-4 ring-emerald-500/50 scale-110'
                          : comp?.level === 'exact'
                          ? 'border-amber-400 bg-gradient-to-b from-slate-900 to-black'
                          : comp?.level === 'good'
                          ? 'border-sky-400 bg-gradient-to-b from-slate-900 to-black'
                          : 'border-rose-400 bg-gradient-to-b from-slate-900 to-black'
                      }`}>
                        <span className="font-athletic font-black text-xs text-amber-400 tabular-nums">
                          {comp?.effectiveRating ?? placedPlayer.overall}
                        </span>
                        <span className="font-bold text-[10px] text-white truncate max-w-[50px] leading-tight">
                          {placedPlayer.shortName}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">
                          {slot.label}
                        </span>
                      </div>

                      {/* Remove Button on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePlayerFromSlot(slot.id);
                          sound.playCardSelect();
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow transition-opacity"
                        title="Remove player"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    // Empty Slot Target
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-500/20 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                          : 'border-white/50 bg-black/40 hover:border-white hover:bg-black/60'
                      }`}
                    >
                      <span className="font-athletic font-black text-xs text-white tracking-wider">
                        {slot.label}
                      </span>
                      <span className="text-[9px] text-slate-300 font-semibold uppercase">
                        {slot.position}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Formation: <strong className="text-white">{currentFormationConfig.name}</strong></span>
            <span>{currentFormationConfig.description}</span>
          </div>
        </div>

        {/* Team Analytics Dashboard & Slot Assign Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Slot Assignment Tray */}
          {activeSlot ? (
            <div className="bg-[#0b111c] border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Deploying Slot:</span>
                  <div className="text-base font-extrabold text-white">{activeSlot.label} ({activeSlot.position})</div>
                </div>
                <button
                  onClick={() => setActiveSlotId(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Recommended candidates for this tactical slot:
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {candidatePlayers.length > 0 ? (
                  candidatePlayers.slice(0, 8).map(({ player, comp }) => (
                    <div
                      key={player.id}
                      onClick={() => {
                        onPlacePlayerInSlot(activeSlot.id, player);
                        setActiveSlotId(null);
                        sound.playCardSelect();
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="font-athletic text-xl font-black text-amber-400 tabular-nums">
                          {comp.effectiveRating}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[120px]">{player.name}</div>
                          <div className="text-[10px] text-slate-400">{player.primaryPosition} · {player.clubName}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        comp.level === 'exact' ? 'bg-emerald-950 text-emerald-400' :
                        comp.level === 'good' ? 'bg-sky-950 text-sky-400' :
                        comp.level === 'fair' ? 'bg-amber-950 text-amber-400' :
                        'bg-rose-950 text-rose-400'
                      }`}>
                        {comp.level.toUpperCase()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-4">
                    No free candidates available. Draft more players in the PICK tab.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Analytics Dashboard */}
          <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Squad Analytics</h3>
              </div>
              <span className="font-athletic text-xs font-bold text-emerald-400">
                {filledCount} / 11 Deployed
              </span>
            </div>

            {/* Big Ratings KPI Grid */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Overall Rating</span>
                <span className="font-athletic text-3xl font-black text-amber-400 tabular-nums">
                  {analytics.overallRating}
                </span>
              </div>
              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Card Score</span>
                <span className="font-athletic text-3xl font-black text-white tabular-nums">
                  {analytics.cardScore}
                </span>
              </div>
            </div>

            {/* Tactical Ratings Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Scoring Quality</span>
                  <span className="font-athletic font-bold text-white tabular-nums">{analytics.scoringRating}</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${analytics.scoringRating}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Stopping / Defensive Iron</span>
                  <span className="font-athletic font-bold text-white tabular-nums">{analytics.stoppingRating}</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${analytics.stoppingRating}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Teamwork & Chemistry</span>
                  <span className="font-athletic font-bold text-white tabular-nums">{analytics.teamworkRating}</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics.teamworkRating}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Formation Compatibility</span>
                  <span className="font-athletic font-bold text-white tabular-nums">{analytics.formationCompatibility}%</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${analytics.formationCompatibility}%` }} />
                </div>
              </div>
            </div>

            {/* Quick Action: Open Tactics Settings */}
            <button
              onClick={() => setTacticsDrawerOpen(!tacticsDrawerOpen)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-800 flex items-center justify-center gap-2"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>{tacticsDrawerOpen ? 'Hide Tactical System' : 'Configure Tactical System'}</span>
            </button>

            {/* Tournament CTA */}
            {isLineupReady ? (
              <button
                onClick={onGoToPlay}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <span>ENTER RCL CUP TOURNAMENT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="text-center text-xs text-amber-400/90 font-medium p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                Deploy {11 - filledCount} more player{11 - filledCount > 1 ? 's' : ''} to launch the tournament.
              </div>
            )}
          </div>

          {/* Tactics Settings Drawer */}
          {tacticsDrawerOpen && (
            <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tactical Instructions</h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Build-up Play</label>
                  <select
                    value={tactics.buildup}
                    onChange={(e) => onChangeTactics({ ...tactics, buildup: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    <option value="Balanced">Balanced</option>
                    <option value="Direct">Direct</option>
                    <option value="Possession">Possession</option>
                    <option value="Counter">Counter-Attacking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Team Mentality</label>
                  <select
                    value={tactics.mentality}
                    onChange={(e) => onChangeTactics({ ...tactics, mentality: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    <option value="Defensive">Defensive</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Attacking">Attacking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Defensive Line</label>
                  <select
                    value={tactics.defensiveLine}
                    onChange={(e) => onChangeTactics({ ...tactics, defensiveLine: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    <option value="Low">Low Block</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High Line</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Pressing Intensity</label>
                  <select
                    value={tactics.pressing}
                    onChange={(e) => onChangeTactics({ ...tactics, pressing: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High Press</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
