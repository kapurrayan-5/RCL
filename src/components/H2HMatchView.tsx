import React, { useEffect, useState, useRef } from 'react';
import { MultiplayerRoom } from '../types/multiplayer';
import { stepMatchApi, submitLeaderboardApi } from '../services/multiplayerApi';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Trophy, Swords, Shield, Target, Play, FastForward, CheckCircle, RotateCcw, Award } from 'lucide-react';

interface H2HMatchViewProps {
  room: MultiplayerRoom;
  currentMemberId: string;
  onRoomUpdated: (room: MultiplayerRoom) => void;
  onReturnToLobby: () => void;
  onOpenLeaderboard: () => void;
}

export const H2HMatchView: React.FC<H2HMatchViewProps> = ({
  room,
  currentMemberId,
  onRoomUpdated,
  onReturnToLobby,
  onOpenLeaderboard,
}) => {
  const match = room.h2hMatch;
  const isHost = room.hostId === currentMemberId;

  const home = room.members.find(m => m.id === match?.homeMemberId) || room.members[0];
  const away = room.members.find(m => m.id === match?.awayMemberId) || room.members[1] || room.members[0];

  const isHomeUser = currentMemberId === home.id;
  const isAwayUser = currentMemberId === away.id;

  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1000); // ms per step
  const [latestGoal, setLatestGoal] = useState<string | null>(null);
  const recordedRef = useRef<boolean>(false);

  // Auto-advance match steps if host
  useEffect(() => {
    if (!match || match.isFinished || !isPlayingAuto || !isHost) return;

    const timer = setInterval(async () => {
      try {
        const prevEventsCount = match.events.length;
        const updated = await stepMatchApi(room.code);
        onRoomUpdated(updated);

        // Check for new goal
        const newMatch = updated.h2hMatch;
        if (newMatch && newMatch.events.length > prevEventsCount) {
          const topEvent = newMatch.events[0];
          if (topEvent.type === 'GOAL') {
            sound.playGoalCelebration();
            setLatestGoal(topEvent.description);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
            setTimeout(() => setLatestGoal(null), 3000);
          } else if (topEvent.type === 'SAVE') {
            sound.playKick();
          }
        }
      } catch (err) {
        // error handling
      }
    }, speed);

    return () => clearInterval(timer);
  }, [match?.isFinished, isPlayingAuto, isHost, speed, room.code]);

  // When match finishes, trigger victory fanfare and save leaderboard
  useEffect(() => {
    if (match?.isFinished && !recordedRef.current) {
      recordedRef.current = true;
      sound.playGoalCelebration();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });

      const isWinner = match.winnerId === currentMemberId;
      const currentMember = room.members.find(m => m.id === currentMemberId);

      if (currentMember) {
        submitLeaderboardApi({
          managerName: currentMember.name,
          clubName: currentMember.clubName,
          wins: isWinner ? 1 : 0,
          draws: match.homeScore === match.awayScore ? 1 : 0,
          losses: !isWinner ? 1 : 0,
          trophiesWon: isWinner ? 1 : 0,
          highestScore: currentMember.analytics.overallRating || 82,
          totalGoals: isHomeUser ? match.homeScore : match.awayScore,
        }).catch(() => {});
      }
    }
  }, [match?.isFinished, match?.winnerId, currentMemberId, isHomeUser, match?.homeScore, match?.awayScore]);

  if (!match) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="text-sm text-slate-400">Match is initializing...</div>
      </div>
    );
  }

  const isUserWinner = match.winnerId === currentMemberId;
  const winnerMember = room.members.find(m => m.id === match.winnerId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Goal Alert Notification */}
      {latestGoal && (
        <div className="bg-red-600 border-2 border-amber-400 text-white rounded-2xl p-4 shadow-[0_0_40px_rgba(220,38,38,0.8)] text-center animate-bounce">
          <span className="font-athletic font-black text-2xl tracking-wider uppercase block">
            ⚽ GOAL! GOAL! GOAL!
          </span>
          <span className="text-sm font-bold text-amber-200">{latestGoal}</span>
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="bg-[#0b1322] border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Match Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold rounded-lg uppercase tracking-wider">
              {room.mode === '1v1' ? '1v1 Head-to-Head Final' : 'Multiplayer Cup Clash'}
            </span>
            <span className="text-xs text-slate-400">Room: {room.code}</span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-2 bg-black/60 px-4 py-1.5 rounded-full border border-slate-700">
            <div className={`w-2.5 h-2.5 rounded-full ${match.isFinished ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
            <span className="font-athletic font-black text-xl text-white tracking-widest tabular-nums">
              {match.isFinished ? 'FULL TIME' : `${match.minute}'`}
            </span>
          </div>
        </div>

        {/* Live Clash */}
        <div className="grid grid-cols-11 gap-4 items-center">
          {/* Home Team */}
          <div className="col-span-4 text-center sm:text-right space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              {home.name} {isHomeUser ? '(You)' : ''}
            </span>
            <h3 className="font-athletic font-black text-2xl sm:text-3xl text-white truncate">
              {home.clubName}
            </h3>
            <span className="text-xs text-emerald-400 font-bold block">
              OVR: {home.analytics.overallRating || 82} • {home.formation}
            </span>
          </div>

          {/* Score Box */}
          <div className="col-span-3 text-center">
            <div className="bg-gradient-to-b from-slate-900 to-black border-2 border-slate-700/80 rounded-2xl py-3 px-4 shadow-xl inline-flex items-center gap-4">
              <span className="font-athletic font-black text-4xl sm:text-5xl text-white tabular-nums">
                {match.homeScore}
              </span>
              <span className="text-slate-600 font-athletic text-2xl">-</span>
              <span className="font-athletic font-black text-4xl sm:text-5xl text-white tabular-nums">
                {match.awayScore}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="col-span-4 text-center sm:text-left space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              {away.name} {isAwayUser ? '(You)' : ''}
            </span>
            <h3 className="font-athletic font-black text-2xl sm:text-3xl text-white truncate">
              {away.clubName}
            </h3>
            <span className="text-xs text-rose-400 font-bold block">
              OVR: {away.analytics.overallRating || 82} • {away.formation}
            </span>
          </div>
        </div>

        {/* Possession Stats Bar */}
        <div className="mt-8 pt-4 border-t border-slate-800/80">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-bold">
            <span>{match.stats.possession[0]}% Possession</span>
            <span>{match.stats.possession[1]}% Possession</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${match.stats.possession[0]}%` }}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${match.stats.possession[1]}%` }}
            />
          </div>
        </div>
      </div>

      {/* Post Match Celebration Banner */}
      {match.isFinished && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg">
            <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
          </div>

          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
              🏆 Champion of the Direct Match Battle
            </span>
            <h2 className="font-athletic font-black text-3xl sm:text-4xl text-white">
              {winnerMember ? `${winnerMember.name} Wins the Clash!` : 'Match Decided!'}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {isUserWinner
                ? 'Brilliant tactical masterclass! Your victory has been updated to the Online Global Leaderboard.'
                : 'Hard fought battle! Inspect the global rankings or draft again for revenge.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenLeaderboard}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-athletic font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
            >
              <Award className="w-4 h-4" />
              <span>View Global Leaderboard</span>
            </button>

            <button
              onClick={onReturnToLobby}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch / Return to Lobby</span>
            </button>
          </div>
        </div>
      )}

      {/* Minute-by-Minute Live Event Timeline */}
      <div className="bg-[#0b1322] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h4 className="font-athletic font-black text-lg text-white uppercase tracking-wider flex items-center gap-2">
          <span>Live Match Commentary & Timeline</span>
        </h4>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {match.events.map(ev => {
            const isHome = ev.team === 'home';
            return (
              <div
                key={ev.id}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  ev.type === 'GOAL'
                    ? 'bg-amber-950/40 border-amber-500/70 text-amber-200'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-athletic font-black text-sm text-amber-400 w-8 tabular-nums">
                    {ev.minute}'
                  </span>
                  <div>
                    <span className="font-bold text-white mr-1.5">{ev.playerName}:</span>
                    <span>{ev.description}</span>
                  </div>
                </div>

                <span className="font-athletic font-bold text-xs text-slate-400 tabular-nums">
                  {ev.scoreline}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
