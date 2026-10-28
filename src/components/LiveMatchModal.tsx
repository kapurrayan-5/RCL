import React, { useState, useEffect, useRef } from 'react';
import { MatchEvent, MatchSimulationResult } from '../types/game';
import { sound } from '../utils/sound';
import { Play, Pause, FastForward, SkipForward, Volume2, Shield, Award, CheckCircle } from 'lucide-react';

interface LiveMatchModalProps {
  simulationResult: MatchSimulationResult;
  onFinish: (result: MatchSimulationResult) => void;
  speedSetting: 'slow' | 'normal' | 'fast' | 'ultra';
}

export const LiveMatchModal: React.FC<LiveMatchModalProps> = ({
  simulationResult,
  onFinish,
  speedSetting,
}) => {
  const [currentMinute, setCurrentMinute] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast' | 'ultra'>(speedSetting);
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);

  const totalMinutes = simulationResult.wentToExtraTime ? 120 : 90;
  const isMatchOver = currentMinute >= totalMinutes;

  // Derive current score from visible goal events
  const currentHomeScore = visibleEvents.filter(e => e.type === 'goal' && e.team === 'home').length;
  const currentAwayScore = visibleEvents.filter(e => e.type === 'goal' && e.team === 'away').length;

  // Ball position on 2D mini radar
  const [ballPos, setBallPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Speed intervals in ms per simulation minute
  const speedIntervals = {
    slow: 350,
    normal: 180,
    fast: 70,
    ultra: 0,
  };

  useEffect(() => {
    // If ultra speed or already finished, instantly skip to end
    if (speed === 'ultra') {
      setCurrentMinute(totalMinutes);
      setVisibleEvents(simulationResult.events);
      sound.playWhistle(true);
      return;
    }

    if (!isPlaying || isMatchOver) return;

    const interval = setInterval(() => {
      setCurrentMinute(prev => {
        const nextMin = prev + 1;

        // Check if any event happens in this minute
        const eventsInMinute = simulationResult.events.filter(e => e.minute === nextMin);
        if (eventsInMinute.length > 0) {
          setVisibleEvents(curr => [...curr, ...eventsInMinute]);

          eventsInMinute.forEach(ev => {
            if (ev.type === 'goal') {
              sound.playGoalCelebration();
            } else if (ev.type === 'save' || ev.type === 'woodwork') {
              sound.playKick();
            } else if (ev.type === 'half_time' || ev.type === 'full_time') {
              sound.playWhistle(true);
            }
          });
        }

        // Animate ball based on possession and attacking minute
        const isHomeAttacking = Math.random() < (simulationResult.stats.possession / 100);
        setBallPos({
          x: isHomeAttacking ? 60 + Math.random() * 30 : 10 + Math.random() * 30,
          y: 20 + Math.random() * 60,
        });

        if (nextMin >= totalMinutes) {
          sound.playWhistle(true);
          return totalMinutes;
        }
        return nextMin;
      });
    }, speedIntervals[speed]);

    return () => clearInterval(interval);
  }, [isPlaying, isMatchOver, speed, simulationResult, totalMinutes]);

  const handleSkipToFullTime = () => {
    setCurrentMinute(totalMinutes);
    setVisibleEvents(simulationResult.events);
    sound.playWhistle(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#0a0f1a] border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Scoreboard Header */}
        <div className="bg-gradient-to-r from-slate-950 via-[#0f172a] to-slate-950 p-6 border-b border-slate-800 text-center relative">
          {/* Match Stage & Clock */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-athletic font-bold px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 uppercase tracking-widest">
              RCL CUP · {isMatchOver ? 'FULL-TIME' : 'LIVE SIMULATION'}
            </span>
            <div className="font-athletic text-2xl font-black text-amber-400 tabular-nums">
              {currentMinute}' {isMatchOver ? 'FT' : ''}
            </div>
            <div className="text-xs text-slate-400 font-semibold">
              {simulationResult.wentToExtraTime ? '120 MINS' : '90 MINS'}
            </div>
          </div>

          {/* Teams and Scoreline */}
          <div className="grid grid-cols-11 items-center gap-2">
            {/* Home Team */}
            <div className="col-span-4 flex items-center justify-end gap-3 text-right">
              <div>
                <div className="text-base sm:text-xl font-extrabold text-white truncate max-w-[170px] sm:max-w-[220px]">
                  {simulationResult.homeTeam.name}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {simulationResult.homeTeam.shortName} · OVR {simulationResult.homeTeam.rating}
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-athletic font-black text-sm shadow-md shrink-0 border border-white/10"
                style={{ backgroundColor: simulationResult.homeTeam.primaryColor, color: simulationResult.homeTeam.secondaryColor }}
              >
                {simulationResult.homeTeam.shortName}
              </div>
            </div>

            {/* Score */}
            <div className="col-span-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 font-athletic text-4xl sm:text-5xl font-black text-white tabular-nums tracking-wider bg-black/40 px-4 py-1.5 rounded-2xl border border-white/5">
                <span>{isMatchOver ? simulationResult.homeScore : currentHomeScore}</span>
                <span className="text-slate-500">:</span>
                <span>{isMatchOver ? simulationResult.awayScore : currentAwayScore}</span>
              </div>
              {simulationResult.wentToPenalties && isMatchOver && (
                <span className="text-[11px] text-amber-400 font-athletic font-bold mt-1">
                  (Penalties: {simulationResult.homePenalties} - {simulationResult.awayPenalties})
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-4 flex items-center justify-start gap-3 text-left">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-athletic font-black text-sm shadow-md shrink-0 border border-white/10"
                style={{ backgroundColor: simulationResult.awayTeam.primaryColor, color: simulationResult.awayTeam.secondaryColor }}
              >
                {simulationResult.awayTeam.shortName}
              </div>
              <div>
                <div className="text-base sm:text-xl font-extrabold text-white truncate max-w-[170px] sm:max-w-[220px]">
                  {simulationResult.awayTeam.name}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {simulationResult.awayTeam.shortName} · OVR {simulationResult.awayTeam.rating}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2D Mini Tactical Radar & Match Progression */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800">
          <div className="relative w-full h-24 rounded-xl tactical-pitch border border-[#1f5f33] overflow-hidden flex items-center justify-center">
            {/* Markings */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
            <div className="absolute w-12 h-12 rounded-full border border-white/40" />
            <div className="absolute left-0 inset-y-4 w-10 border border-white/40" />
            <div className="absolute right-0 inset-y-4 w-10 border border-white/40" />

            {/* Ball Marker */}
            <div
              style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
              className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_8px_#ffffff] -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            />
          </div>

          {/* Timeline progress line */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-200"
                style={{ width: `${(currentMinute / totalMinutes) * 100}%` }}
              />
            </div>
            <span className="font-athletic text-xs font-bold text-slate-400 tabular-nums">
              {Math.round((currentMinute / totalMinutes) * 100)}%
            </span>
          </div>
        </div>

        {/* Middle Body: Live Commentary Feed & Match Stats */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[220px]">
          {/* Live Commentary Feed (7 Cols) */}
          <div className="md:col-span-7 p-4 border-r border-slate-800 overflow-y-auto space-y-2.5 max-h-[260px]">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-[#0a0f1a] py-1">
              Live Commentary & Events
            </div>

            {visibleEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Kick-off! The match is underway at the RCL Arena...
              </div>
            ) : (
              [...visibleEvents].reverse().map((ev, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl text-xs border ${
                    ev.type === 'goal'
                      ? 'bg-red-950/40 border-red-500/50 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                      : ev.type === 'save'
                      ? 'bg-sky-950/30 border-sky-500/30 text-sky-200'
                      : ev.type === 'yellow_card'
                      ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-0.5">
                    <span className="font-athletic text-amber-400 tabular-nums">{ev.minute}'</span>
                    <span className="uppercase text-[11px] font-extrabold">
                      {ev.type === 'goal' ? '⚽ GOAL!' : ev.type.toUpperCase()}
                    </span>
                    <span className="text-slate-400">· {ev.teamName}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {ev.description}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Real-time Match Stats (5 Cols) */}
          <div className="md:col-span-5 p-4 bg-slate-900/40 space-y-3 overflow-y-auto max-h-[260px] text-xs">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-center">
              Match Statistics
            </div>

            {/* Possession */}
            <div className="space-y-1">
              <div className="flex justify-between font-athletic font-bold tabular-nums">
                <span className="text-amber-400">{simulationResult.stats.possession}%</span>
                <span className="text-slate-400 font-sans font-normal text-[11px]">Possession</span>
                <span className="text-sky-400">{100 - simulationResult.stats.possession}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${simulationResult.stats.possession}%` }} />
                <div className="bg-sky-500 h-full" style={{ width: `${100 - simulationResult.stats.possession}%` }} />
              </div>
            </div>

            {/* Shots */}
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.shots.home}</span>
              <span className="text-slate-400">Total Shots</span>
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.shots.away}</span>
            </div>

            {/* Shots on Target */}
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.shotsOnTarget.home}</span>
              <span className="text-slate-400">Shots on Target</span>
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.shotsOnTarget.away}</span>
            </div>

            {/* Expected Goals (xG) */}
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="font-athletic font-bold tabular-nums text-emerald-400">{simulationResult.stats.xG.home}</span>
              <span className="text-slate-400">Expected Goals (xG)</span>
              <span className="font-athletic font-bold tabular-nums text-emerald-400">{simulationResult.stats.xG.away}</span>
            </div>

            {/* Saves */}
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.saves.home}</span>
              <span className="text-slate-400">Goalkeeper Saves</span>
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.saves.away}</span>
            </div>

            {/* Corners */}
            <div className="flex justify-between py-1">
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.corners.home}</span>
              <span className="text-slate-400">Corner Kicks</span>
              <span className="font-athletic font-bold tabular-nums text-white">{simulationResult.stats.corners.away}</span>
            </div>
          </div>
        </div>

        {/* Bottom Playback & Speed Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Speed Controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {(['slow', 'normal', 'fast', 'ultra'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors capitalize ${
                  speed === s ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Action Button: Skip or Continue */}
          {!isMatchOver ? (
            <button
              onClick={handleSkipToFullTime}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip to Full-Time</span>
            </button>
          ) : (
            <button
              onClick={() => onFinish(simulationResult)}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>PROCEED TO TOURNAMENT STANDINGS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
