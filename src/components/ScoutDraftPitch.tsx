import React, { useState } from 'react';
import { ClubSeason, FormationSlot, FormationType, Player, Position, TeamAnalytics } from '../types/game';
import { FORMATIONS, getPositionalCompatibility } from '../utils/formation';
import { getRandomClub } from '../data/clubs';
import { sound } from '../utils/sound';
import { Sparkles, Trophy, Shield, Target, Users, RefreshCw, CheckCircle, ArrowRight, X, AlertCircle, Lock, Dices } from 'lucide-react';

interface ScoutDraftPitchProps {
  formation: FormationType;
  startingXI: Record<string, Player | null>;
  onPlacePlayerInSlot: (slotId: string, player: Player) => void;
  analytics: TeamAnalytics;
  onLaunchLiveCup: () => void;
  rerollsRemaining: number;
  onUseReroll: () => boolean;
}

export const ScoutDraftPitch: React.FC<ScoutDraftPitchProps> = ({
  formation,
  startingXI,
  onPlacePlayerInSlot,
  analytics,
  onLaunchLiveCup,
  rerollsRemaining,
  onUseReroll,
}) => {
  const formationConfig = FORMATIONS[formation];

  // Active scout report
  const [currentScoutReport, setCurrentScoutReport] = useState<ClubSeason>(() => getRandomClub());
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [lastPlacedInfo, setLastPlacedInfo] = useState<{ playerName: string; slotLabel: string } | null>(null);

  // Active selected player from roster awaiting pitch slot click
  const [selectedCandidate, setSelectedCandidate] = useState<Player | null>(null);

  // Placed player IDs
  const placedPlayerIds = Object.values(startingXI).filter((p): p is Player => p !== null).map(p => p.id);
  const filledCount = placedPlayerIds.length;
  const isSquadFull = filledCount === 11;

  // Check which positions still have open slots in the formation
  const isPlayerPositionAvailable = (player: Player): boolean => {
    return formationConfig.slots.some(slot => {
      const isSlotEmpty = startingXI[slot.id] === null;
      if (!isSlotEmpty) return false;
      const comp = getPositionalCompatibility(player, slot.position);
      return comp.score >= 0.70;
    });
  };

  // Helper to generate next randomized team
  const rollNextSquad = (showChime = true) => {
    setIsScouting(true);
    sound.playPackReveal();

    setTimeout(() => {
      const newSquad = getRandomClub([currentScoutReport.id]);
      setCurrentScoutReport(newSquad);
      setSelectedCandidate(null);
      setIsScouting(false);
      if (showChime) sound.playGoalCelebration();
    }, 600);
  };

  // Handle manual Reroll button click (Consumes 1 of the 3 rerolls)
  const handleManualReroll = () => {
    if (rerollsRemaining <= 0) {
      sound.playKick();
      return;
    }
    const success = onUseReroll();
    if (success) {
      rollNextSquad(true);
    }
  };

  // Handle click on a player in the roster
  const handleSelectCandidate = (player: Player) => {
    if (placedPlayerIds.includes(player.id)) return;

    if (!isPlayerPositionAvailable(player)) {
      sound.playKick();
      return;
    }

    setSelectedCandidate(player);
    sound.playCardSelect();
  };

  // Handle clicking a slot on the pitch
  const handleSlotClick = (slot: FormationSlot) => {
    // Permanent lock: Players cannot be removed or overwritten once added to the team
    if (startingXI[slot.id]) {
      sound.playKick();
      return;
    }

    if (!selectedCandidate) {
      return;
    }

    const comp = getPositionalCompatibility(selectedCandidate, slot.position);
    if (comp.score < 0.6) {
      sound.playKick();
      return;
    }

    onPlacePlayerInSlot(slot.id, selectedCandidate);
    sound.playWhistle();

    const placedName = selectedCandidate.name;
    const placedSlot = slot.label;
    setSelectedCandidate(null);

    setLastPlacedInfo({ playerName: placedName, slotLabel: placedSlot });

    // After a player is chosen from the squad, roll next squad for the next pick
    if (filledCount + 1 < 11) {
      setTimeout(() => {
        rollNextSquad(false);
      }, 700);
    }
  };

  const getSlotCompatibility = (slotPosition: Position) => {
    if (!selectedCandidate) return null;
    return getPositionalCompatibility(selectedCandidate, slotPosition);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header and Step Indicator with Reroll Tokens */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b111c] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>STEP 2 OF 4 · 1-PLAYER-PER-TEAM DRAFT (3 REROLLS ONLY)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Draft Your 11-Man Dream Starting Lineup
          </h1>
          <p className="text-xs text-slate-400">
            Pick <strong>1 player per team</strong>. Placed positions are greyed out. You have <strong>3 total skips/rerolls</strong> for the whole draft.
          </p>
        </div>

        {/* Rerolls Remaining Badge & Button */}
        <div className="flex items-center gap-3">
          {/* Tactical Reroll Meter Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl">
            <Dices className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                REROLLS LEFT
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full border transition-all ${
                      idx < rerollsRemaining
                        ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'bg-slate-800 border-slate-700 opacity-40'
                    }`}
                  />
                ))}
                <span className="font-athletic text-xs font-bold text-white tabular-nums ml-1">
                  {rerollsRemaining}/3
                </span>
              </div>
            </div>
          </div>

          {/* Manual REROLL Button */}
          <button
            type="button"
            onClick={handleManualReroll}
            disabled={isScouting || rerollsRemaining <= 0}
            className={`px-5 py-3.5 font-black tracking-wider text-xs rounded-xl transition-all flex items-center gap-2 ${
              rerollsRemaining > 0
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer active:scale-95'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isScouting ? 'animate-spin' : ''}`} />
            <span>
              {isScouting
                ? 'REROLLING...'
                : rerollsRemaining > 0
                ? `REROLL TEAM (${rerollsRemaining} LEFT)`
                : 'NO REROLLS LEFT'}
            </span>
          </button>

          {isSquadFull && (
            <button
              type="button"
              onClick={onLaunchLiveCup}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black tracking-wider text-sm rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2 cursor-pointer animate-pulse"
            >
              <Trophy className="w-4 h-4" />
              <span>PLAY CUP</span>
            </button>
          )}
        </div>
      </div>

      {/* Reroll Notification Toast */}
      {lastPlacedInfo && !selectedCandidate && !isSquadFull && (
        <div className="bg-emerald-950/70 border border-emerald-500/60 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-200 shadow">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{lastPlacedInfo.playerName}</strong> locked into <strong>{lastPlacedInfo.slotLabel}</strong>! Team consumed — scouted next squad for your next pick.
            </span>
          </div>
          <button
            onClick={() => setLastPlacedInfo(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Flashing Prompt when a player is selected */}
      {selectedCandidate && (
        <div className="bg-amber-950/70 border-2 border-amber-500/80 rounded-2xl p-3.5 flex items-center justify-between text-sm text-amber-200 animate-pulse shadow-lg">
          <div className="flex items-center gap-3">
            <span className="font-athletic text-2xl font-black text-amber-400">
              {selectedCandidate.overall}
            </span>
            <div>
              <span className="font-bold text-white">
                Choose a glowing {selectedCandidate.primaryPosition} spot on the pitch for {selectedCandidate.name} ({selectedCandidate.clubName})
              </span>
              <span className="block text-xs text-amber-300">
                Compatible slots are pulsing. Locking in will advance to the next squad.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedCandidate(null)}
            className="px-3 py-1 bg-amber-900/60 hover:bg-amber-800 text-xs font-bold text-amber-100 rounded-lg border border-amber-600/40"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3-Column Layout: Scouted Roster (4 Cols) | Pitch (5 Cols) | Team Card (3 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scouted Roster (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0b111c] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-xl">
          {/* Active Scout Report Header */}
          <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-athletic font-black text-sm shadow shrink-0 border border-white/10"
                style={{ backgroundColor: currentScoutReport.primaryColor, color: currentScoutReport.textColor || '#000' }}
              >
                {currentScoutReport.shortName}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                    {currentScoutReport.season}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{currentScoutReport.country}</span>
                </div>
                <h3 className="text-base font-extrabold text-white leading-tight">
                  {currentScoutReport.clubName}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">OVR</span>
              <div className="font-athletic text-2xl font-black text-amber-400 tabular-nums">
                {currentScoutReport.squadRating}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed italic">
            {currentScoutReport.summary}
          </p>

          {/* Roster Players List */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
              <span>Choose 1 Player</span>
              <span className="text-[10px] text-slate-500 font-normal">Filled positions greyed out</span>
            </div>

            {currentScoutReport.roster.map(player => {
              const isSelected = selectedCandidate?.id === player.id;
              const isAlreadyDrafted = placedPlayerIds.includes(player.id);
              const positionAvailable = isPlayerPositionAvailable(player);
              const isGreyedOut = isAlreadyDrafted || !positionAvailable;

              return (
                <div
                  key={player.id}
                  onClick={() => handleSelectCandidate(player)}
                  title={
                    isAlreadyDrafted
                      ? 'Already drafted in your starting XI'
                      : !positionAvailable
                      ? `All ${player.primaryPosition} slots in your formation are already filled`
                      : 'Click to select and place on pitch'
                  }
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer'
                      : isGreyedOut
                      ? 'bg-[#070b12] border-slate-900/80 opacity-35 cursor-not-allowed grayscale select-none'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`font-athletic text-xl font-black tabular-nums ${isGreyedOut ? 'text-slate-500' : 'text-amber-400'}`}>
                      {player.overall}
                    </span>
                    <div className="truncate">
                      <div className={`text-xs font-bold truncate ${isGreyedOut ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {player.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {player.primaryPosition} · PAC {player.pace} · SHO {player.shooting} · DEF {player.defending}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAlreadyDrafted ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> IN XI
                      </span>
                    ) : !positionAvailable ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-slate-500" /> FILLED
                      </span>
                    ) : (
                      <span className="font-athletic text-xs font-extrabold px-2 py-0.5 rounded bg-black/40 text-slate-200">
                        {player.primaryPosition}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Reroll Info */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Rerolls remaining: <strong className="text-amber-400 tabular-nums">{rerollsRemaining} of 3</strong></span>
            {rerollsRemaining === 0 && (
              <span className="text-rose-400 text-[10px] font-bold">Rerolls Exhausted</span>
            )}
          </div>
        </div>

        {/* Center Column: Interactive Pitch (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl tactical-pitch border-4 border-[#1f5f33] shadow-2xl overflow-hidden select-none">
            {/* Pitch Markings SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/40" fill="none" strokeWidth="2">
              <rect x="3%" y="3%" width="94%" height="94%" />
              <line x1="3%" y1="50%" x2="97%" y2="50%" />
              <circle cx="50%" cy="50%" r="14%" />
              <circle cx="50%" cy="50%" r="2" fill="white" className="fill-white/60" />
              <rect x="25%" y="3%" width="50%" height="18%" />
              <rect x="37%" y="3%" width="26%" height="7%" />
              <rect x="25%" y="79%" width="50%" height="18%" />
              <rect x="37%" y="90%" width="26%" height="7%" />
            </svg>

            {/* Positional Slots on the Pitch */}
            {formationConfig.slots.map(slot => {
              const placedPlayer = startingXI[slot.id];
              const comp = getSlotCompatibility(slot.position);

              const isCompatible = comp && comp.score >= 0.70;
              const isExact = comp && comp.level === 'exact';

              return (
                <div
                  key={slot.id}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onClick={() => handleSlotClick(slot)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-200 ${
                    placedPlayer ? 'cursor-default' : 'cursor-pointer hover:scale-105'
                  }`}
                >
                  {placedPlayer ? (
                    <div className="relative flex flex-col items-center">
                      <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center p-1 shadow-xl relative overflow-hidden">
                        <span className="font-athletic font-black text-xs text-amber-400 tabular-nums">
                          {placedPlayer.overall}
                        </span>
                        <span className="font-bold text-[9px] text-white truncate max-w-[50px] leading-tight text-center">
                          {placedPlayer.shortName}
                        </span>
                        <span className="text-[8px] font-semibold text-slate-400">
                          {slot.label}
                        </span>
                      </div>

                      {/* Permanent Lock Indicator */}
                      <div
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500/20 border border-amber-400/70 text-amber-400 rounded-full flex items-center justify-center shadow backdrop-blur-xs"
                        title="Player is locked into the starting XI"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                        selectedCandidate
                          ? isExact
                            ? 'border-emerald-400 bg-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.8)] scale-110 animate-pulse'
                            : isCompatible
                            ? 'border-amber-400 bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105 animate-pulse'
                            : 'border-white/30 bg-black/40 opacity-40'
                          : 'border-white/50 bg-black/40 hover:border-white hover:bg-black/60'
                      }`}
                    >
                      <span className="font-athletic font-black text-xs text-white">
                        {slot.label}
                      </span>
                      <span className="text-[8px] text-slate-300 font-semibold uppercase">
                        {slot.position}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Formation: <strong className="text-white">{formationConfig.name}</strong></span>
            <span>Squad: <strong className="text-emerald-400 font-athletic">{filledCount} / 11 Locked</strong></span>
          </div>
        </div>

        {/* Right Column: Team Card Panel (3 Cols) */}
        <div className="lg:col-span-3 bg-[#0b111c] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>TEAM CARD</span>
            </h3>
            <span className="font-athletic text-xs font-extrabold text-amber-400">
              {filledCount}/11 SLOTS
            </span>
          </div>

          {/* Overall Team Score */}
          <div className="bg-gradient-to-br from-slate-900 to-black p-4 rounded-2xl border border-slate-800 text-center space-y-1 shadow-inner">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Overall Team Score
            </span>
            <div className="font-athletic text-5xl font-black text-amber-400 tabular-nums">
              {analytics.overallRating}
            </div>
            <span className="text-[11px] text-slate-400">
              Card Score: <strong className="text-white tabular-nums">{analytics.cardScore}</strong>
            </span>
          </div>

          {/* Live Attribute Meters: Scoring, Stopping, Teamwork */}
          <div className="space-y-4">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Live Attribute Meters
            </span>

            {/* Scoring Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-500" />
                  <span>Scoring</span>
                </span>
                <span className="font-athletic text-base font-black text-white tabular-nums">
                  {analytics.scoringRating}
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${analytics.scoringRating}%` }}
                />
              </div>
            </div>

            {/* Stopping Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span>Stopping</span>
                </span>
                <span className="font-athletic text-base font-black text-white tabular-nums">
                  {analytics.stoppingRating}
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${analytics.stoppingRating}%` }}
                />
              </div>
            </div>

            {/* Teamwork Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Teamwork</span>
                </span>
                <span className="font-athletic text-base font-black text-white tabular-nums">
                  {analytics.teamworkRating}
                </span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${analytics.teamworkRating}%` }}
                />
              </div>
            </div>
          </div>

          {/* Launch Cup CTA when 11-man squad is locked in */}
          {isSquadFull ? (
            <button
              type="button"
              onClick={onLaunchLiveCup}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              <span>PLAY CUP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-amber-400/90 font-medium space-y-1">
              <div>Lock in {11 - filledCount} more player{11 - filledCount > 1 ? 's' : ''}</div>
              <div className="text-[10px] text-slate-500">Pick 1 player per team. Tactical rerolls: {rerollsRemaining}/3 remaining.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
