import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types/multiplayer';
import { getLeaderboardApi } from '../services/multiplayerApi';
import { Trophy, Award, Medal, RefreshCw, X, Shield, Star, Users } from 'lucide-react';

interface LeaderboardModalProps {
  currentManagerName: string;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  currentManagerName,
  onClose,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'TROPHIES' | 'WINS' | 'SCORE'>('TROPHIES');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboardApi();
      setEntries(data);
    } catch (err) {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const sortedEntries = [...entries].sort((a, b) => {
    if (filter === 'TROPHIES') return b.trophiesWon - a.trophiesWon || b.wins - a.wins;
    if (filter === 'WINS') return b.wins - a.wins || b.winRate - a.winRate;
    return b.highestScore - a.highestScore || b.trophiesWon - a.trophiesWon;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1322] border-2 border-amber-500/40 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)] relative text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="font-athletic font-black text-2xl sm:text-3xl tracking-wide uppercase">
                Online Global Leaderboards
              </h2>
              <p className="text-xs text-slate-400">
                World manager rankings across multiplayer battles & RCL Cup tournament runs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs & Refresh */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setFilter('TROPHIES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                filter === 'TROPHIES'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Trophies Won
            </button>
            <button
              onClick={() => setFilter('WINS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                filter === 'WINS'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Match Wins
            </button>
            <button
              onClick={() => setFilter('SCORE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                filter === 'SCORE'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top Team Card
            </button>
          </div>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 transition ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {sortedEntries.map((entry, idx) => {
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;
            const isMe = entry.managerName.toLowerCase() === currentManagerName.toLowerCase() || entry.isCurrentUser;

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : isTop1
                    ? 'bg-amber-950/30 border-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Rank & Manager Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-8 flex items-center justify-center">
                    {isTop1 ? (
                      <div className="w-7 h-7 rounded-full bg-amber-400 text-black font-athletic font-black text-sm flex items-center justify-center shadow">
                        1
                      </div>
                    ) : isTop2 ? (
                      <div className="w-7 h-7 rounded-full bg-slate-300 text-black font-athletic font-black text-sm flex items-center justify-center shadow">
                        2
                      </div>
                    ) : isTop3 ? (
                      <div className="w-7 h-7 rounded-full bg-amber-700 text-white font-athletic font-black text-sm flex items-center justify-center shadow">
                        3
                      </div>
                    ) : (
                      <span className="font-athletic font-bold text-sm text-slate-500 tabular-nums">
                        #{idx + 1}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {entry.managerName}
                      </span>
                      {isMe && (
                        <span className="text-[9px] bg-amber-400 text-black font-black uppercase px-1.5 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 block">
                      {entry.clubName} • Record: {entry.wins}W - {entry.draws}D - {entry.losses}L ({entry.winRate}% Win Rate)
                    </span>
                  </div>
                </div>

                {/* Score & Trophies */}
                <div className="flex items-center gap-4 sm:gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Team Score</span>
                    <span className="font-athletic font-black text-base text-amber-400 tabular-nums">
                      {entry.highestScore}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Trophies</span>
                    <div className="flex items-center gap-1 justify-end font-athletic font-black text-lg text-white">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{entry.trophiesWon}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
