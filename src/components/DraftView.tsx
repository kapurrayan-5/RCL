import React, { useState, useMemo } from 'react';
import { Player, PositionCategory } from '../types/game';
import { PlayerCard } from './PlayerCard';
import { sound } from '../utils/sound';
import { Search, Filter, ArrowUpDown, Scale, Check, Plus, X } from 'lucide-react';

interface DraftViewProps {
  availablePlayers: Player[];
  selectedPlayerIdsInXI: string[];
  onDraftPlayerToSquad: (player: Player) => void;
  onGoToPlace: () => void;
  guidedEnabled: boolean;
}

export const DraftView: React.FC<DraftViewProps> = ({
  availablePlayers,
  selectedPlayerIdsInXI,
  onDraftPlayerToSquad,
  onGoToPlace,
  guidedEnabled,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<'ALL' | PositionCategory>('ALL');
  const [rarityFilter, setRarityFilter] = useState<'ALL' | 'Legendary' | 'Rare' | 'Standard'>('ALL');
  const [sortBy, setSortBy] = useState<'overall' | 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'>('overall');

  // Player comparison state
  const [comparingPlayer1, setComparingPlayer1] = useState<Player | null>(null);
  const [comparingPlayer2, setComparingPlayer2] = useState<Player | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Filter & sort players
  const filteredPlayers = useMemo(() => {
    return availablePlayers
      .filter(p => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q);
          const matchClub = p.clubName.toLowerCase().includes(q);
          const matchNation = p.nationality.toLowerCase().includes(q);
          if (!matchName && !matchClub && !matchNation) return false;
        }

        if (positionFilter !== 'ALL') {
          if (positionFilter === 'GK' && p.primaryPosition !== 'GK') return false;
          if (positionFilter === 'DEF' && !['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.primaryPosition)) return false;
          if (positionFilter === 'MID' && !['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p.primaryPosition)) return false;
          if (positionFilter === 'ATT' && !['ST', 'CF', 'LW', 'RW'].includes(p.primaryPosition)) return false;
        }

        if (rarityFilter !== 'ALL' && p.rarity !== rarityFilter) return false;

        return true;
      })
      .sort((a, b) => {
        return (b[sortBy] as number) - (a[sortBy] as number);
      });
  }, [availablePlayers, searchQuery, positionFilter, rarityFilter, sortBy]);

  const handleOpenComparison = (player: Player) => {
    if (!comparingPlayer1) {
      setComparingPlayer1(player);
      setIsComparisonOpen(true);
    } else if (!comparingPlayer2 && comparingPlayer1.id !== player.id) {
      setComparingPlayer2(player);
      setIsComparisonOpen(true);
    } else {
      setComparingPlayer1(player);
      setIsComparisonOpen(true);
    }
    sound.playCardSelect();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Guided Banner */}
      {guidedEnabled && (
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider">Draft Guide:</span>
            <span>Inspect attributes, compare head-to-head, and recruit footballers. When ready, switch to <strong>PLACE</strong> to organize your tactical formation.</span>
          </div>
          <button
            onClick={onGoToPlace}
            className="font-bold text-blue-400 hover:text-white transition-colors"
          >
            Go to Pitch Placement →
          </button>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="bg-[#0b111c] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search footballers by name, club, or nationality..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Position Segmented Filters */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => {
                  setPositionFilter(pos);
                  sound.playCardSelect();
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  positionFilter === pos
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-500"
            >
              <option value="overall">Overall Rating</option>
              <option value="pace">Pace</option>
              <option value="shooting">Shooting</option>
              <option value="passing">Passing</option>
              <option value="dribbling">Dribbling</option>
              <option value="defending">Defending</option>
              <option value="physical">Physicality</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Displaying <strong>{filteredPlayers.length}</strong> available footballers</span>
          <span className="text-slate-500">Starting XI: {selectedPlayerIdsInXI.length} / 11 drafted</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map(player => {
            const isDraftedInXI = selectedPlayerIdsInXI.includes(player.id);
            return (
              <div key={player.id} className="relative group">
                <PlayerCard
                  player={player}
                  selected={isDraftedInXI}
                  showActions={true}
                  onCompare={() => handleOpenComparison(player)}
                  onClick={() => {
                    sound.playCardSelect();
                    onDraftPlayerToSquad(player);
                  }}
                />

                {/* Status Indicator */}
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  {isDraftedInXI ? (
                    <div className="flex items-center gap-1 bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full shadow">
                      <Check className="w-3 h-3" />
                      <span>IN XI</span>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-slate-200 text-[10px] px-2 py-0.5 rounded-full border border-slate-700">
                      Click to Place
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Drawer / Modal */}
      {isComparisonOpen && comparingPlayer1 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b111c] border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white tracking-wide">Player Comparison Radar</h3>
              </div>
              <button
                onClick={() => {
                  setIsComparisonOpen(false);
                  setComparingPlayer2(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Cards & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player 1 */}
              <div className="space-y-4">
                <PlayerCard player={comparingPlayer1} />
                <button
                  onClick={() => {
                    onDraftPlayerToSquad(comparingPlayer1);
                    setIsComparisonOpen(false);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  {selectedPlayerIdsInXI.includes(comparingPlayer1.id) ? 'Already in XI' : 'Draft into Starting XI'}
                </button>
              </div>

              {/* Player 2 or Picker */}
              <div className="space-y-4">
                {comparingPlayer2 ? (
                  <>
                    <PlayerCard player={comparingPlayer2} />
                    <button
                      onClick={() => {
                        onDraftPlayerToSquad(comparingPlayer2);
                        setIsComparisonOpen(false);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      {selectedPlayerIdsInXI.includes(comparingPlayer2.id) ? 'Already in XI' : 'Draft into Starting XI'}
                    </button>
                  </>
                ) : (
                  <div className="h-full min-h-[300px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <Scale className="w-10 h-10 text-slate-600" />
                    <div className="text-sm font-semibold text-slate-300">Select a second player to compare</div>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Pick any other footballer from the list to see side-by-side attribute advantages.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto">
                      {availablePlayers
                        .filter(p => p.id !== comparingPlayer1.id)
                        .slice(0, 6)
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => setComparingPlayer2(p)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg border border-slate-700"
                          >
                            {p.shortName} ({p.overall})
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stat Bars Comparison if both selected */}
            {comparingPlayer2 && (
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  Attribute Comparison
                </div>
                {[
                  { label: 'Overall', key: 'overall' },
                  { label: 'Pace', key: 'pace' },
                  { label: 'Shooting', key: 'shooting' },
                  { label: 'Passing', key: 'passing' },
                  { label: 'Dribbling', key: 'dribbling' },
                  { label: 'Defending', key: 'defending' },
                  { label: 'Physicality', key: 'physical' },
                  { label: 'Tactical IQ', key: 'tacticalIQ' },
                ].map(stat => {
                  const val1 = comparingPlayer1[stat.key as keyof Player] as number;
                  const val2 = comparingPlayer2[stat.key as keyof Player] as number;
                  const diff = val1 - val2;
                  return (
                    <div key={stat.key} className="flex items-center justify-between text-xs gap-3">
                      <span className={`w-16 font-athletic font-bold text-sm text-right tabular-nums ${val1 > val2 ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}`}>
                        {val1}
                      </span>
                      <div className="flex-1 text-center font-medium text-slate-400">
                        {stat.label}
                      </div>
                      <span className={`w-16 font-athletic font-bold text-sm text-left tabular-nums ${val2 > val1 ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}`}>
                        {val2}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
