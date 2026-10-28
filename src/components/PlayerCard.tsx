import React from 'react';
import { Player } from '../types/game';

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  compatLevel?: 'exact' | 'good' | 'fair' | 'poor';
  effectiveRating?: number;
  compact?: boolean;
  mini?: boolean;
  onClick?: () => void;
  onCompare?: () => void;
  showActions?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  selected,
  compatLevel,
  effectiveRating,
  compact = false,
  mini = false,
  onClick,
  onCompare,
  showActions = false,
}) => {
  const isLegendary = player.rarity === 'Legendary';
  const isRare = player.rarity === 'Rare';

  const cardBorder = selected
    ? 'ring-2 ring-emerald-400 border-emerald-400'
    : isLegendary
    ? 'border-amber-400/70 shadow-[0_4px_20px_rgba(245,158,11,0.25)]'
    : isRare
    ? 'border-sky-400/60 shadow-[0_4px_16px_rgba(56,189,248,0.2)]'
    : 'border-slate-700/80 hover:border-slate-500';

  const cardGradient = isLegendary
    ? 'bg-gradient-to-b from-[#241705] via-[#1a1205] to-[#0c0802]'
    : isRare
    ? 'bg-gradient-to-b from-[#0a1a33] via-[#081226] to-[#040814]'
    : 'bg-gradient-to-b from-[#182030] via-[#111724] to-[#0a0e17]';

  const badgeText = isLegendary ? 'text-amber-400' : isRare ? 'text-sky-300' : 'text-slate-300';

  if (mini) {
    return (
      <div
        onClick={onClick}
        className={`relative flex items-center justify-between p-2 rounded-lg border ${cardBorder} ${cardGradient} cursor-pointer transition-all hover:scale-[1.02]`}
      >
        <div className="flex items-center gap-2">
          <div className="font-athletic text-lg font-bold text-amber-400 tabular-nums">
            {effectiveRating !== undefined ? effectiveRating : player.overall}
          </div>
          <div className="text-left leading-tight">
            <div className="text-xs font-bold text-white truncate max-w-[110px]">{player.shortName}</div>
            <div className="text-[10px] text-slate-400">{player.primaryPosition} · {player.clubName}</div>
          </div>
        </div>
        {compatLevel && (
          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            compatLevel === 'exact' ? 'bg-emerald-950 text-emerald-400' :
            compatLevel === 'good' ? 'bg-blue-950 text-blue-400' :
            compatLevel === 'fair' ? 'bg-amber-950 text-amber-400' :
            'bg-rose-950 text-rose-400'
          }`}>
            {compatLevel.toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`relative flex flex-col p-2.5 rounded-xl border ${cardBorder} ${cardGradient} cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-athletic text-2xl font-black text-amber-400 tabular-nums">
              {effectiveRating !== undefined ? effectiveRating : player.overall}
            </span>
            <span className="text-xs font-bold text-slate-300">{player.primaryPosition}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">{player.seasonYear}</span>
        </div>

        <div className="text-sm font-bold text-white truncate">{player.name}</div>
        <div className="text-xs text-slate-400 truncate mb-2">{player.clubName} · {player.nationality}</div>

        <div className="grid grid-cols-6 gap-1 text-center font-athletic text-xs font-bold border-t border-slate-700/60 pt-1.5">
          <div><span className="block text-[9px] text-slate-500 font-normal">PAC</span>{player.pace}</div>
          <div><span className="block text-[9px] text-slate-500 font-normal">SHO</span>{player.shooting}</div>
          <div><span className="block text-[9px] text-slate-500 font-normal">PAS</span>{player.passing}</div>
          <div><span className="block text-[9px] text-slate-500 font-normal">DRI</span>{player.dribbling}</div>
          <div><span className="block text-[9px] text-slate-500 font-normal">DEF</span>{player.defending}</div>
          <div><span className="block text-[9px] text-slate-500 font-normal">PHY</span>{player.physical}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full rounded-2xl border p-4 ${cardBorder} ${cardGradient} transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl group`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <div className="font-athletic text-4xl font-extrabold text-amber-400 tabular-nums leading-none tracking-tight">
            {effectiveRating !== undefined ? effectiveRating : player.overall}
          </div>
          <div className="text-sm font-bold text-slate-200 tracking-wider">
            {player.primaryPosition}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className={`text-[11px] font-extrabold tracking-wider uppercase ${badgeText}`}>
            {player.rarity}
          </div>
          <div className="text-[11px] text-slate-400 font-athletic">
            {player.seasonYear}
          </div>
        </div>
      </div>

      {/* Player Emblem / Profile silhouette representation */}
      <div className="h-16 flex items-center justify-between px-2 mb-3 bg-black/30 rounded-xl border border-white/5">
        <div className="flex flex-col">
          <div className="text-base font-black text-white tracking-wide truncate max-w-[160px]">
            {player.name}
          </div>
          <div className="text-xs text-slate-300 font-medium truncate max-w-[160px]">
            {player.clubName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold text-slate-400">
            {player.nationality}
          </div>
          <div className="text-[10px] text-slate-500">
            {player.preferredFoot} Foot
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-6 gap-1 bg-black/40 rounded-xl p-2.5 border border-white/5 font-athletic text-center mb-3">
        <div>
          <span className="block text-[10px] text-slate-400 font-sans font-medium">PAC</span>
          <span className="text-base font-bold text-white tabular-nums">{player.pace}</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-sans font-medium">SHO</span>
          <span className="text-base font-bold text-white tabular-nums">{player.shooting}</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-sans font-medium">PAS</span>
          <span className="text-base font-bold text-white tabular-nums">{player.passing}</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-sans font-medium">DRI</span>
          <span className="text-base font-bold text-white tabular-nums">{player.dribbling}</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-sans font-medium">DEF</span>
          <span className="text-base font-bold text-white tabular-nums">{player.defending}</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-sans font-medium">PHY</span>
          <span className="text-base font-bold text-white tabular-nums">{player.physical}</span>
        </div>
      </div>

      {/* Tactical IQ Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Tactical Intelligence</span>
        <span className="font-athletic font-bold text-emerald-400 tabular-nums">{player.tacticalIQ}</span>
      </div>

      {/* Comparison Action */}
      {showActions && onCompare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
          className="mt-3 w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors border border-slate-700"
        >
          Compare Player
        </button>
      )}
    </div>
  );
};
