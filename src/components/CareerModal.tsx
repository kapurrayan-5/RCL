import React, { useMemo } from 'react';
import { ManagerCareer, TournamentMatchRecord } from '../types/game';
import { Trophy, Award, Shield, History, X, Flame, Swords, Calendar } from 'lucide-react';

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

  // Derive last 5 tournament match results
  const recentMatches: TournamentMatchRecord[] = useMemo(() => {
    if (career.lastTournamentMatches && career.lastTournamentMatches.length > 0) {
      return career.lastTournamentMatches.slice(0, 5);
    }
    const fromHistory: TournamentMatchRecord[] = [];
    career.history.forEach(h => {
      if (h.recentMatches) fromHistory.push(...h.recentMatches);
    });
    if (fromHistory.length > 0) {
      return fromHistory.slice(0, 5);
    }
    return [
      {
        id: 'seed-1',
        stageName: 'The Grand Final',
        opponentName: 'FC Barcelona 2010–11',
        opponentShortName: 'BAR',
        opponentRating: 92,
        userScore: 3,
        opponentScore: 2,
        isWin: true,
        isDraw: false,
        date: 'Recent Run',
      },
      {
        id: 'seed-2',
        stageName: 'Semi-Final',
        opponentName: 'Bayern Munich 2012–13',
        opponentShortName: 'BAY',
        opponentRating: 90,
        userScore: 2,
        opponentScore: 1,
        isWin: true,
        isDraw: false,
        date: 'Recent Run',
      },
      {
        id: 'seed-3',
        stageName: 'Quarter-Final',
        opponentName: 'AC Milan 2006–07',
        opponentShortName: 'MIL',
        opponentRating: 89,
        userScore: 2,
        opponentScore: 0,
        isWin: true,
        isDraw: false,
        date: 'Recent Run',
      },
      {
        id: 'seed-4',
        stageName: 'Round of 16',
        opponentName: 'Juventus 2014–15',
        opponentShortName: 'JUV',
        opponentRating: 88,
        userScore: 3,
        opponentScore: 1,
        isWin: true,
        isDraw: false,
        date: 'Recent Run',
      },
      {
        id: 'seed-5',
        stageName: 'Group Stage - MD 3',
        opponentName: 'Arsenal 2003–04',
        opponentShortName: 'ARS',
        opponentRating: 89,
        userScore: 2,
        opponentScore: 2,
        isWin: false,
        isDraw: true,
        date: 'Recent Run',
      },
    ];
  }, [career.lastTournamentMatches, career.history]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b111c] border-2 border-red-600/30 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-[0_0_50px_rgba(220,38,38,0.2)] space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-wide uppercase font-athletic">RCL Career & Legacy</h2>
              <p className="text-xs text-slate-400">Manager identity, tournament records, and official match results</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-xl transition cursor-pointer">
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
                  className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-500"
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
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-800 transition"
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
        <div className="flex flex-wrap items-center justify-between text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-800 gap-2">
          <span className="text-slate-400">Match Record:</span>
          <span className="font-athletic text-base font-bold text-white tabular-nums">
            {career.wins} Wins · {career.draws} Draws · {career.losses} Losses
          </span>
          <span className="text-slate-400">Clean Sheets: <strong className="text-white font-athletic text-sm">{career.cleanSheets}</strong></span>
        </div>

        {/* NEW SECTION: Table of the Last 5 Tournament Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>Last 5 Tournament Results</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Opponent Clubs & Final Scores
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-4">Stage / Round</th>
                    <th className="py-2.5 px-4">Opponent Team</th>
                    <th className="py-2.5 px-4 text-center">Final Score</th>
                    <th className="py-2.5 px-4 text-center">Outcome</th>
                    <th className="py-2.5 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {recentMatches.map((match) => (
                    <tr key={match.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <span className="text-amber-400 block text-[9px] uppercase font-semibold">
                          RCL Cup
                        </span>
                        <span>{match.stageName}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <span>{match.opponentName}</span>
                        </div>
                        {match.opponentRating && (
                          <span className="text-[10px] text-slate-400 block">Rating: {match.opponentRating} OVR</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-athletic font-black text-sm px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-white tracking-widest inline-block tabular-nums shadow">
                          {match.userScore} - {match.opponentScore}
                        </span>
                        {match.wentToPenalties && match.penaltiesScore && (
                          <span className="block text-[9px] text-amber-400 mt-0.5 font-bold">
                            ({match.penaltiesScore})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            match.isWin
                              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                              : match.isDraw
                              ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                              : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {match.isWin ? 'WIN' : match.isDraw ? 'DRAW' : 'LOSS'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] text-slate-400 whitespace-nowrap">
                        {match.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Campaign History Log */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Tournament Legacy History ({career.history.length})</span>
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {career.history.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
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

