import React, { useState } from 'react';
import { ClubSeason, Player } from '../types/game';
import { ALL_CLUBS, getRandomClub } from '../data/clubs';
import { PlayerCard } from './PlayerCard';
import { sound } from '../utils/sound';
import { Sparkles, Star, History, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

interface ScoutViewProps {
  scoutedClubs: ClubSeason[];
  onScoutNewClub: (club: ClubSeason) => void;
  onSelectPlayerForDraft: (player: Player) => void;
  onGoToPick: () => void;
  guidedEnabled: boolean;
}

export const ScoutView: React.FC<ScoutViewProps> = ({
  scoutedClubs,
  onScoutNewClub,
  onSelectPlayerForDraft,
  onGoToPick,
  guidedEnabled,
}) => {
  const [selectedClubId, setSelectedClubId] = useState<string>(scoutedClubs[0]?.id || '');
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [newlyDiscoveredClub, setNewlyDiscoveredClub] = useState<ClubSeason | null>(null);

  const activeClub = scoutedClubs.find(c => c.id === selectedClubId) || scoutedClubs[0];

  const handleLaunchScout = () => {
    setIsRevealing(true);
    sound.playPackReveal();

    setTimeout(() => {
      // Pick a club that hasn't been scouted yet if available
      const scoutedIds = scoutedClubs.map(c => c.id);
      const newClub = getRandomClub(scoutedIds);

      setNewlyDiscoveredClub(newClub);
      onScoutNewClub(newClub);
      setSelectedClubId(newClub.id);
      setIsRevealing(false);
      sound.playGoalCelebration();
    }, 900);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Guided Mode Banner */}
      {guidedEnabled && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">Scouting Guide:</span>
            <span>Uncover legendary club seasons from 2000–2026. Each scouting report unlocks iconic footballers ready to be drafted into your dream starting XI.</span>
          </div>
          <button
            onClick={onGoToPick}
            className="flex items-center gap-1 font-bold text-amber-400 hover:text-white transition-colors"
          >
            <span>Proceed to Pick</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Scouting Command Center */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1627] to-[#160c1d] border border-slate-800 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 tracking-widest uppercase">
              <Sparkles className="w-4 h-4" />
              <span>RCL SCOUT · HISTORICAL DOSSIERS (2000–2026)</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Scout Legendary Club Seasons
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Dispatch elite scouts across Europe and South America. Uncover historic UEFA Champions League winners, invincible domestic champions, and world-class squads.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleLaunchScout}
              disabled={isRevealing}
              className="relative px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black tracking-wider text-sm rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRevealing ? 'animate-spin' : ''}`} />
              <span>{isRevealing ? 'SCOUTING CLUB...' : 'DISPATCH NEW SCOUT'}</span>
            </button>
            <button
              onClick={onGoToPick}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-colors border border-slate-700"
            >
              VIEW DRAFT POOL
            </button>
          </div>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Scouted Reports Selector Tray */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <History className="w-4 h-4 text-slate-400" />
            <span>Discovered Scouting Reports ({scoutedClubs.length} of {ALL_CLUBS.length})</span>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {scoutedClubs.map(club => {
            const isSelected = club.id === activeClub?.id;
            return (
              <button
                key={club.id}
                onClick={() => {
                  setSelectedClubId(club.id);
                  sound.playCardSelect();
                }}
                className={`relative shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-athletic font-extrabold text-xs shadow"
                  style={{ backgroundColor: club.primaryColor, color: club.secondaryColor === '#ffffff' ? '#000' : club.secondaryColor }}
                >
                  {club.shortName}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{club.clubName}</div>
                  <div className="text-[10px] text-slate-400 font-athletic font-semibold">{club.season} · OVR {club.squadRating}</div>
                </div>
                <div className="flex items-center">
                  {Array.from({ length: club.stars }).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Club Scouting Dossier Display */}
      {activeClub && (
        <div className="rounded-2xl border border-slate-800 bg-[#0c121e] overflow-hidden">
          {/* Header of Dossier */}
          <div className="p-6 md:p-8 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 to-transparent">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-athletic font-black text-2xl shadow-xl border border-white/10 shrink-0"
                  style={{ backgroundColor: activeClub.primaryColor, color: activeClub.textColor || '#000' }}
                >
                  {activeClub.shortName}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-athletic font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase tracking-wider">
                      {activeClub.rarity} REPORT
                    </span>
                    <span className="text-xs text-slate-400">
                      {activeClub.country} · {activeClub.category.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    {activeClub.clubName} — {activeClub.season}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
                    {activeClub.summary}
                  </p>
                </div>
              </div>

              {/* Club Metrics Box */}
              <div className="flex items-center gap-6 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 self-start lg:self-auto">
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase">Squad OVR</span>
                  <span className="font-athletic text-2xl font-black text-amber-400 tabular-nums">{activeClub.squadRating}</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase">Formation</span>
                  <span className="font-athletic text-2xl font-black text-white">{activeClub.defaultFormation}</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase">Available</span>
                  <span className="font-athletic text-2xl font-black text-emerald-400 tabular-nums">{activeClub.roster.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Tactical Identity: <strong className="text-slate-200">{activeClub.tacticalStyle}</strong></span>
              </div>
            </div>
          </div>

          {/* Available Roster Cards */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Eligible Footballers ({activeClub.roster.length})
              </h3>
              <span className="text-xs text-slate-400">
                Click any player to inspect and recruit into your squad
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeClub.roster.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  compact={false}
                  onClick={() => {
                    sound.playCardSelect();
                    onSelectPlayerForDraft(player);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
