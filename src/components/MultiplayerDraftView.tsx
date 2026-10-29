import React, { useState } from 'react';
import { MultiplayerRoom, RoomMember } from '../types/multiplayer';
import { FormationSlot, FormationType, Player, Position, TeamAnalytics } from '../types/game';
import { ALL_CLUBS } from '../data/clubs';
import { FORMATIONS, getPositionalCompatibility } from '../utils/formation';
import { draftPickApi, rerollSquadApi } from '../services/multiplayerApi';
import { sound } from '../utils/sound';
import { Sparkles, Trophy, Shield, Target, Users, RefreshCw, CheckCircle, Lock, AlertCircle, Swords, ArrowRight, Dices } from 'lucide-react';

interface MultiplayerDraftViewProps {
  room: MultiplayerRoom;
  currentMemberId: string;
  onRoomUpdated: (room: MultiplayerRoom) => void;
  onAdvanceToComparison: () => void;
}

export const MultiplayerDraftView: React.FC<MultiplayerDraftViewProps> = ({
  room,
  currentMemberId,
  onRoomUpdated,
  onAdvanceToComparison,
}) => {
  const currentMember = room.members.find(m => m.id === currentMemberId) || room.members[0];
  const opponentMember = room.members.find(m => m.id !== currentMemberId) || room.members[1] || room.members[0];

  const isMyTurn = room.currentTurnMemberId === currentMember.id;
  const formationConfig = FORMATIONS[currentMember.formation];

  // Current scouted club/squad
  const currentScoutReport = ALL_CLUBS.find(c => c.id === room.activeSquadId) || ALL_CLUBS[0];

  // Selected candidate awaiting placement onto pitch
  const [selectedCandidate, setSelectedCandidate] = useState<Player | null>(null);
  const [submittingPick, setSubmittingPick] = useState<boolean>(false);
  const [rerolling, setRerolling] = useState<boolean>(false);

  const myPlacedIds = Object.values(currentMember.startingXI).filter((p): p is Player => p !== null).map(p => p.id);
  const myFilledCount = myPlacedIds.length;
  const oppPlacedCount = Object.values(opponentMember.startingXI).filter(Boolean).length;

  const isPlayerPositionAvailable = (player: Player): boolean => {
    return formationConfig.slots.some(slot => {
      const isSlotEmpty = currentMember.startingXI[slot.id] === null;
      if (!isSlotEmpty) return false;
      const comp = getPositionalCompatibility(player, slot.position);
      return comp.score >= 0.70;
    });
  };

  const handleSelectCandidate = (player: Player) => {
    if (!isMyTurn) {
      sound.playKick();
      return;
    }
    // Check if player is claimed by ANY manager (exclusive pool rule)
    if (room.claimedPlayerIds.includes(player.id)) {
      sound.playKick();
      return;
    }
    if (!isPlayerPositionAvailable(player)) {
      sound.playKick();
      return;
    }

    setSelectedCandidate(player);
    sound.playCardSelect();
  };

  const handleSlotClick = async (slot: FormationSlot) => {
    if (!isMyTurn || !selectedCandidate || submittingPick) return;

    // Permanent lock: already filled slot cannot be replaced
    if (currentMember.startingXI[slot.id]) {
      sound.playKick();
      return;
    }

    const comp = getPositionalCompatibility(selectedCandidate, slot.position);
    if (comp.score < 0.6) {
      sound.playKick();
      return;
    }

    setSubmittingPick(true);
    sound.playWhistle();

    try {
      const updated = await draftPickApi(room.code, currentMember.id, selectedCandidate.id, slot.id);
      setSelectedCandidate(null);
      onRoomUpdated(updated);

      if (updated.status === 'READY_BATTLE') {
        sound.playGoalCelebration();
        setTimeout(onAdvanceToComparison, 1000);
      }
    } catch (err: any) {
      sound.playKick();
    } finally {
      setSubmittingPick(false);
    }
  };

  const handleManualReroll = async () => {
    if (!isMyTurn || currentMember.rerollsLeft <= 0 || rerolling) {
      sound.playKick();
      return;
    }
    setRerolling(true);
    sound.playPackReveal();
    try {
      const updated = await rerollSquadApi(room.code, currentMember.id);
      setSelectedCandidate(null);
      onRoomUpdated(updated);
    } catch (err) {
      sound.playKick();
    } finally {
      setRerolling(false);
    }
  };

  const getSlotCompatibility = (slotPosition: Position) => {
    if (!selectedCandidate) return null;
    return getPositionalCompatibility(selectedCandidate, slotPosition);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner: Real-Time Room & Turn Status */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <Swords className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-athletic font-black text-lg text-white">
                ROOM: {room.code}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30">
                {room.mode === '1v1' ? '1v1 Cup Final Draft' : 'Full Cup Draft'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Exclusive Player Pool Active: Once picked, players cannot be drafted by opponents.
            </span>
          </div>
        </div>

        {/* Turn Indicator */}
        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border shadow-lg ${
              isMyTurn
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{isMyTurn ? 'YOUR DRAFT TURN — PICK A PLAYER' : `WAITING FOR ${room.members.find(m => m.id === room.currentTurnMemberId)?.name || 'OPPONENT'}`}</span>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Turn Index</div>
            <div className="font-athletic font-bold text-sm text-white">#{room.turnIndex + 1}</div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Head-to-Head Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scouted Squad Report & Exclusive Player Selection (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scout Report Header */}
          <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl pointer-events-none"
              style={{ backgroundColor: currentScoutReport.primaryColor || '#dc2626' }}
            />

            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                  Scouted Report • {currentScoutReport.season}
                </span>
                <h3 className="font-athletic font-black text-2xl text-white">
                  {currentScoutReport.clubName}
                </h3>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {currentScoutReport.tacticalStyle} • {currentScoutReport.country}
                </span>
              </div>

              {/* Reroll Button (3 Max) */}
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handleManualReroll}
                  disabled={!isMyTurn || currentMember.rerollsLeft <= 0 || rerolling}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition"
                  title="Manual Squad Reroll"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${rerolling ? 'animate-spin' : ''}`} />
                  <span>Reroll</span>
                </button>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Dices className="w-3 h-3 text-amber-400" />
                  <span>Rerolls: <strong className="text-amber-400">{currentMember.rerollsLeft}/3</strong></span>
                </div>
              </div>
            </div>

            {/* Turn guidance message */}
            {!isMyTurn ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Opponent is scouting. Players will automatically sync as soon as they make a move.</span>
              </div>
            ) : selectedCandidate ? (
              <div className="bg-amber-950/70 border border-amber-500/80 rounded-xl p-2.5 text-xs text-amber-200 animate-pulse flex items-center justify-between">
                <span>
                  Placing <strong>{selectedCandidate.name} ({selectedCandidate.overall})</strong> — Click a glowing slot on pitch!
                </span>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-amber-300 hover:text-white font-bold ml-2 underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                Click any available player below to select and place them into your starting XI.
              </div>
            )}
          </div>

          {/* Scouted Roster with Exclusive Pool Lock Enforcement */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {currentScoutReport.roster.map(player => {
              const isClaimedByOpponent = room.claimedPlayerIds.includes(player.id) && !myPlacedIds.includes(player.id);
              const isClaimedByMe = myPlacedIds.includes(player.id);
              const isPosAvailable = isPlayerPositionAvailable(player);
              const isSelected = selectedCandidate?.id === player.id;
              const disabled = isClaimedByOpponent || isClaimedByMe || !isPosAvailable || !isMyTurn;

              return (
                <div
                  key={player.id}
                  onClick={() => !disabled && handleSelectCandidate(player)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isClaimedByOpponent
                      ? 'bg-rose-950/20 border-rose-900/60 opacity-50 cursor-not-allowed'
                      : isClaimedByMe
                      ? 'bg-emerald-950/30 border-emerald-800/60 opacity-60 cursor-not-allowed'
                      : !isPosAvailable
                      ? 'bg-slate-950/40 border-slate-800 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer'
                      : isMyTurn
                      ? 'bg-slate-900/70 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80 cursor-pointer'
                      : 'bg-slate-900/50 border-slate-800 cursor-not-allowed opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-athletic font-black text-lg text-amber-400 tabular-nums w-7 text-center">
                      {player.overall}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">
                          {player.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {player.primaryPosition}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        PAC: {player.pace} • SHO: {player.shooting} • PAS: {player.passing} • DEF: {player.defending}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isClaimedByOpponent ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-900/50 text-rose-300 border border-rose-700/60 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-rose-400" />
                        <span>Opponent Locked</span>
                      </span>
                    ) : isClaimedByMe ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>In Your XI</span>
                      </span>
                    ) : !isPosAvailable ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                        Position Filled
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black animate-pulse">
                        Selected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {isMyTurn ? 'Draft' : 'Turn pending'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Tactical Pitch & Side-by-Side Manager Comparison (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Manager Progress Bar Comparison */}
          <div className="grid grid-cols-2 gap-3 bg-[#0b1322] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="border-r border-slate-800 pr-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-white flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {currentMember.name} (You)
                </span>
                <span className="font-athletic font-bold text-emerald-400">{myFilledCount}/11</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(myFilledCount / 11) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>Formation: {currentMember.formation}</span>
                <span>OVR: {currentMember.analytics.overallRating || '--'}</span>
              </div>
            </div>

            <div className="pl-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-white flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  {opponentMember.name} (Friend)
                </span>
                <span className="font-athletic font-bold text-rose-400">{oppPlacedCount}/11</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${(oppPlacedCount / 11) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>Formation: {opponentMember.formation}</span>
                <span>OVR: {opponentMember.analytics.overallRating || '--'}</span>
              </div>
            </div>
          </div>

          {/* Tactical Pitch with Permanent Lock Badges */}
          <div className="bg-[#081b11] border-2 border-emerald-900/60 rounded-3xl p-4 shadow-2xl relative min-h-[460px] overflow-hidden flex flex-col justify-between">
            {/* Pitch Markings SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
              xmlns="http://www.w3.org/2000/svg"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
            >
              <rect x="5%" y="3%" width="90%" height="94%" rx="8" />
              <line x1="5%" y1="50%" x2="95%" y2="50%" />
              <circle cx="50%" cy="50%" r="55" />
              <rect x="25%" y="3%" width="50%" height="18%" />
              <rect x="37%" y="3%" width="26%" height="7%" />
              <rect x="25%" y="79%" width="50%" height="18%" />
              <rect x="37%" y="90%" width="26%" height="7%" />
            </svg>

            {/* Pitch Slots */}
            {formationConfig.slots.map(slot => {
              const placedPlayer = currentMember.startingXI[slot.id];
              const comp = getSlotCompatibility(slot.position);
              const isCompatible = comp && comp.score >= 0.70;
              const isExact = comp && comp.level === 'exact';

              return (
                <div
                  key={slot.id}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onClick={() => handleSlotClick(slot)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform ${
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
                      <div
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500/20 border border-amber-400/70 text-amber-400 rounded-full flex items-center justify-center shadow backdrop-blur-xs"
                        title="Player is permanently locked"
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

            <div className="mt-auto flex items-center justify-between text-xs text-slate-400 px-2 pt-2">
              <span>Formation: <strong className="text-white">{currentMember.formation}</strong></span>
              <span>Squad: <strong className="text-emerald-400 font-athletic">{myFilledCount}/11 Locked</strong></span>
            </div>
          </div>

          {/* If both ready for battle */}
          {myFilledCount === 11 && oppPlacedCount === 11 && (
            <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-xl animate-bounce">
              <div>
                <h4 className="font-athletic font-black text-lg">Both Squads Complete!</h4>
                <p className="text-xs text-red-100">Advance to compare tactics and launch your 1v1 battle.</p>
              </div>
              <button
                onClick={onAdvanceToComparison}
                className="px-5 py-2.5 bg-white text-red-600 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow hover:bg-slate-100 transition cursor-pointer"
              >
                <span>Compare & Battle</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
