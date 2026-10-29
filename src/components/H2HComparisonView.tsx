import React, { useState } from 'react';
import { MultiplayerRoom, RoomMember } from '../types/multiplayer';
import { launchMatchApi } from '../services/multiplayerApi';
import { sound } from '../utils/sound';
import { Swords, Trophy, Shield, Target, Users, Play, Sparkles, Flame, CheckCircle, ArrowLeft } from 'lucide-react';
import { Player } from '../types/game';

interface H2HComparisonViewProps {
  room: MultiplayerRoom;
  currentMemberId: string;
  onRoomUpdated: (room: MultiplayerRoom) => void;
  onLaunchMatch: () => void;
  onBackToDraft: () => void;
}

export const H2HComparisonView: React.FC<H2HComparisonViewProps> = ({
  room,
  currentMemberId,
  onRoomUpdated,
  onLaunchMatch,
  onBackToDraft,
}) => {
  const currentMember = room.members.find(m => m.id === currentMemberId) || room.members[0];
  const opponentMember = room.members.find(m => m.id !== currentMemberId) || room.members[1] || room.members[0];

  const isHost = room.hostId === currentMember.id;
  const [launching, setLaunching] = useState(false);

  const myPlayers = Object.values(currentMember.startingXI).filter((p): p is Player => p !== null);
  const oppPlayers = Object.values(opponentMember.startingXI).filter((p): p is Player => p !== null);

  const myOvr = Math.round(myPlayers.reduce((a, b) => a + b.overall, 0) / (myPlayers.length || 1));
  const oppOvr = Math.round(oppPlayers.reduce((a, b) => a + b.overall, 0) / (oppPlayers.length || 1));

  const mySho = Math.round(myPlayers.reduce((a, b) => a + b.shooting, 0) / (myPlayers.length || 1));
  const oppSho = Math.round(oppPlayers.reduce((a, b) => a + b.shooting, 0) / (oppPlayers.length || 1));

  const myDef = Math.round(myPlayers.reduce((a, b) => a + b.defending, 0) / (myPlayers.length || 1));
  const oppDef = Math.round(oppPlayers.reduce((a, b) => a + b.defending, 0) / (oppPlayers.length || 1));

  const myPas = Math.round(myPlayers.reduce((a, b) => a + b.passing, 0) / (myPlayers.length || 1));
  const oppPas = Math.round(oppPlayers.reduce((a, b) => a + b.passing, 0) / (oppPlayers.length || 1));

  // Find Star Players
  const myStar = [...myPlayers].sort((a, b) => b.overall - a.overall)[0];
  const oppStar = [...oppPlayers].sort((a, b) => b.overall - a.overall)[0];

  const handleLaunch = async () => {
    if (!isHost || launching) return;
    setLaunching(true);
    sound.playGoalCelebration();
    try {
      const updated = await launchMatchApi(room.code, currentMember.id);
      onRoomUpdated(updated);
      onLaunchMatch();
    } catch (err) {
      sound.playKick();
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/40 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest">
          <Swords className="w-3.5 h-3.5" />
          <span>Head-to-Head Tactical Standoff</span>
        </div>
        <h2 className="font-athletic font-black text-4xl text-white tracking-wide uppercase">
          See If You Can Beat Them
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Compare tactical systems, team ratings, and positional strengths before entering the live simulated arena.
        </p>
      </div>

      {/* Big Clash Comparison Card */}
      <div className="bg-[#0b1322] border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
          {/* Left: Your Squad */}
          <div className="md:col-span-5 bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-5 space-y-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Manager 1 (You)
                </span>
                <h3 className="font-athletic font-black text-2xl text-white">
                  {currentMember.clubName}
                </h3>
                <span className="text-xs text-slate-400">
                  Tactics: {currentMember.formation} • {currentMember.tactics.mentality}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overall</span>
                <span className="font-athletic font-black text-4xl text-amber-400">
                  {myOvr}
                </span>
              </div>
            </div>

            {/* Star Player Badge */}
            {myStar && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Key Talisman</span>
                    <span className="font-bold text-sm text-white">{myStar.name}</span>
                  </div>
                </div>
                <span className="font-athletic font-black text-lg text-amber-400">{myStar.overall}</span>
              </div>
            )}

            {/* Lineup Roster Preview */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {myPlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/40 border border-slate-800/60">
                  <span className="text-slate-300 font-medium truncate">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{p.primaryPosition}</span>
                    <span className="font-athletic font-bold text-amber-400">{p.overall}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: VS Badge */}
          <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-athletic font-black text-2xl text-white shadow-[0_0_25px_rgba(220,38,38,0.6)] border border-red-400/40">
              VS
            </div>
          </div>

          {/* Right: Opponent's Squad */}
          <div className="md:col-span-5 bg-slate-900/80 border border-rose-500/40 rounded-2xl p-5 space-y-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Manager 2 (Friend)
                </span>
                <h3 className="font-athletic font-black text-2xl text-white">
                  {opponentMember.clubName}
                </h3>
                <span className="text-xs text-slate-400">
                  Tactics: {opponentMember.formation} • {opponentMember.tactics.mentality}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overall</span>
                <span className="font-athletic font-black text-4xl text-rose-400">
                  {oppOvr}
                </span>
              </div>
            </div>

            {/* Star Player Badge */}
            {oppStar && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Key Talisman</span>
                    <span className="font-bold text-sm text-white">{oppStar.name}</span>
                  </div>
                </div>
                <span className="font-athletic font-black text-lg text-rose-400">{oppStar.overall}</span>
              </div>
            )}

            {/* Lineup Roster Preview */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {oppPlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/40 border border-slate-800/60">
                  <span className="text-slate-300 font-medium truncate">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{p.primaryPosition}</span>
                    <span className="font-athletic font-bold text-rose-400">{p.overall}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side-by-Side Stat Breakdown */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Attacking Firepower (Shooting)
            </span>
            <div className="flex items-center justify-center gap-3 font-athletic font-black text-xl">
              <span className={mySho >= oppSho ? 'text-emerald-400' : 'text-slate-400'}>{mySho}</span>
              <span className="text-xs text-slate-600">vs</span>
              <span className={oppSho >= mySho ? 'text-rose-400' : 'text-slate-400'}>{oppSho}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Defensive Solidity (Defending)
            </span>
            <div className="flex items-center justify-center gap-3 font-athletic font-black text-xl">
              <span className={myDef >= oppDef ? 'text-emerald-400' : 'text-slate-400'}>{myDef}</span>
              <span className="text-xs text-slate-600">vs</span>
              <span className={oppDef >= myDef ? 'text-rose-400' : 'text-slate-400'}>{oppDef}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Midfield Control (Passing)
            </span>
            <div className="flex items-center justify-center gap-3 font-athletic font-black text-xl">
              <span className={myPas >= oppPas ? 'text-emerald-400' : 'text-slate-400'}>{myPas}</span>
              <span className="text-xs text-slate-600">vs</span>
              <span className={oppPas >= myPas ? 'text-rose-400' : 'text-slate-400'}>{oppPas}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDraft}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Draft Pitch</span>
        </button>

        {isHost ? (
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="px-8 py-4 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-athletic font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.6)] cursor-pointer flex items-center gap-2.5 transition animate-pulse"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Launch Live Head-to-Head Battle</span>
          </button>
        ) : (
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Waiting for host to launch the match battle...</span>
          </div>
        )}
      </div>
    </div>
  );
};
