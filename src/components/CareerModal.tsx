import React from 'react';
import { ManagerCareer } from '../types/game';
import { Trophy, Award, Shield, History, X, Flame } from 'lucide-react';

interface CareerModalProps {
  career: ManagerCareer;
  onClose: () => void;
  onUpdateManagerName: (name: string, clubName: string) => void;
}

export const CareerModal: React.FC<CareerModalProps> = ({
  career,
  onClose,
  onUpdateManagerName,
}) => {
  const [managerName, setManagerName] = React.useState(career.managerName);
  const [clubName, setClubName] = React.useState(career.clubName);
  const [isEditing, setIsEditing] = React.useState(false);

  const winRate = career.totalMatches > 0
    ? Math.round((career.wins / career.totalMatches) * 100)
    : 0;

  const handleSaveProfile = () => {
    onUpdateManagerName(managerName, clubName);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b111c] border border-slate-700 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-extrabold text-white tracking-wide">RCL CAREER & LEGACY</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manager Profile Box */}
        <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager Name"
                  className="bg-black/50 border border-slate-700 px-3 py-1.5 text-sm rounded-lg text-white w-full"
                />
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Club Name"
                  className="bg-black/50 border border-slate-700 px-3 py-1.5 text-sm rounded-lg text-white w-full"
                />
                <button
                  onClick={handleSaveProfile}
                  className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <div className="text-lg font-black text-white">{career.managerName}</div>
                <div className="text-xs text-amber-400 font-semibold">{career.clubName}</div>
                <div className="text-[11px] text-slate-400">Head Coach & Director of Football</div>
              </>
            )}
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg"
            >
              Edit Identity
            </button>
          )}
        </div>

        {/* Trophies & Career KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-athletic">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="block text-[10px] text-slate-400 font-sans font-semibold uppercase">Trophies Won</span>
            <span className="text-3xl font-black text-amber-400 tabular-nums">{career.trophiesWon}</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="block text-[10px] text-slate-400 font-sans font-semibold uppercase">Win Rate</span>
            <span className="text-3xl font-black text-emerald-400 tabular-nums">{winRate}%</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="block text-[10px] text-slate-400 font-sans font-semibold uppercase">Total Matches</span>
            <span className="text-3xl font-black text-white tabular-nums">{career.totalMatches}</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <span className="block text-[10px] text-slate-400 font-sans font-semibold uppercase">Goals Scored</span>
            <span className="text-3xl font-black text-sky-400 tabular-nums">{career.totalGoalsScored}</span>
          </div>
        </div>

        {/* Match Breakdown W-D-L */}
        <div className="flex items-center justify-between text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400">Match Record:</span>
          <span className="font-athletic text-base font-bold text-white tabular-nums">
            {career.wins} Wins · {career.draws} Draws · {career.losses} Losses
          </span>
          <span className="text-slate-400">Clean Sheets: <strong className="text-white font-athletic text-sm">{career.cleanSheets}</strong></span>
        </div>

        {/* Campaign History Log */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Tournament Legacy History ({career.history.length})</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {career.history.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No tournament campaigns completed yet. Launch the RCL Cup to etch your name in football history!
              </div>
            ) : (
              career.history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{record.squadName}</div>
                    <div className="text-[11px] text-slate-400">{record.date} · {record.matchesPlayed} Matches</div>
                  </div>
                  <div className="text-right">
                    <span className={`font-athletic font-bold px-2 py-0.5 rounded text-xs ${
                      record.finish === 'CHAMPION' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {record.finish}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-athletic">
                      Top Scorer: {record.topScorer.name} ({record.topScorer.goals})
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
