import React, { useState } from 'react';
import { MultiplayerMode, MultiplayerRoom } from '../types/multiplayer';
import { createRoomApi, joinRoomApi, startDraftApi, toggleReadyApi } from '../services/multiplayerApi';
import { sound } from '../utils/sound';
import { X, Users, Trophy, Copy, Check, Swords, Shield, Play, Link, UserPlus } from 'lucide-react';

interface MultiplayerLobbyModalProps {
  currentRoom: MultiplayerRoom | null;
  currentMemberId: string | null;
  managerName: string;
  clubName: string;
  onRoomUpdated: (room: MultiplayerRoom, memberId: string) => void;
  onClose: () => void;
  onStartDraft: () => void;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  currentRoom,
  currentMemberId,
  managerName,
  clubName,
  onRoomUpdated,
  onClose,
  onStartDraft,
}) => {
  const [tab, setTab] = useState<'HOST' | 'JOIN'>(currentRoom ? 'HOST' : 'HOST');
  const [mode, setMode] = useState<MultiplayerMode>('1v1');
  const [customCode, setCustomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = currentRoom && currentMemberId ? currentRoom.hostId === currentMemberId : false;
  const currentMember = currentRoom?.members.find(m => m.id === currentMemberId);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const { room, currentMemberId: newId } = await createRoomApi(
        managerName || 'Manager 1',
        clubName || 'RCL Dream XI',
        mode,
        customCode.trim() || undefined
      );
      sound.playCardSelect();
      onRoomUpdated(room, newId);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      sound.playKick();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { room, currentMemberId: newId } = await joinRoomApi(
        joinCode.trim(),
        managerName || 'Challenger',
        clubName || 'Challenger XI'
      );
      sound.playCardSelect();
      onRoomUpdated(room, newId);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      sound.playKick();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentRoom || !currentMemberId) return;
    try {
      sound.playWhistle();
      const updated = await toggleReadyApi(currentRoom.code, currentMemberId);
      onRoomUpdated(updated, currentMemberId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartDraftClick = async () => {
    if (!currentRoom || !currentMemberId) return;
    try {
      sound.playGoalCelebration();
      const updated = await startDraftApi(currentRoom.code, currentMemberId);
      onRoomUpdated(updated, currentMemberId);
      onStartDraft();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyInviteLink = () => {
    if (!currentRoom) return;
    const inviteUrl = `${window.location.origin}?room=${currentRoom.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    sound.playCardSelect();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopiedCode(true);
    sound.playCardSelect();
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1322] border-2 border-red-600/40 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] relative text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg border border-red-400/40">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-athletic font-black text-2xl tracking-wide uppercase">
                Play Against Friends
              </h2>
              <p className="text-xs text-slate-400">
                Host or join private multiplayer draft rooms & 1v1 Cup Finals
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

        {error && (
          <div className="bg-red-950/70 border border-red-500/60 rounded-xl p-3 text-xs text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold underline text-red-300">
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: Active In-Room Lobby */}
        {currentRoom ? (
          <div className="space-y-6">
            {/* Room Banner */}
            <div className="bg-gradient-to-r from-red-950/50 via-slate-900 to-slate-950 border border-red-600/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  {currentRoom.mode === '1v1'
                    ? '1v1 Cup Final (Head-to-Head)'
                    : currentRoom.mode === 'TOURNAMENT_4'
                    ? '4-Team Full Cup Bracket'
                    : '8-Team Full Cup Tournament'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-athletic font-black text-white tracking-wider">
                    {currentRoom.code}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 border border-slate-700 transition"
                    title="Copy Room Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4 text-amber-400" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Invite Link'}</span>
                </button>
              </div>
            </div>

            {/* Connected Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Connected Managers ({currentRoom.members.length} / {currentRoom.mode === '1v1' ? 2 : currentRoom.mode === 'TOURNAMENT_4' ? 4 : 8})
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold animate-pulse">
                  ● Real-time sync active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentRoom.members.map((member, idx) => {
                  const isMe = member.id === currentMemberId;
                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isMe
                          ? 'bg-slate-900/90 border-amber-500/50 shadow-md'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-amber-600 font-athletic font-black text-sm flex items-center justify-center text-white border border-white/20">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white">
                                {member.name}
                              </span>
                              {member.isHost && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                  Host
                                </span>
                              )}
                              {isMe && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block truncate max-w-[140px]">
                              {member.clubName}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            member.ready
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {member.ready ? 'Ready' : 'Waiting'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Empty Slots */}
                {Array.from({
                  length: (currentRoom.mode === '1v1' ? 2 : currentRoom.mode === 'TOURNAMENT_4' ? 4 : 8) - currentRoom.members.length,
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/30 flex items-center justify-center text-slate-500 text-xs gap-2"
                  >
                    <UserPlus className="w-4 h-4 opacity-50" />
                    <span>Waiting for friend to join with code...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusive Pool Notice */}
            <div className="bg-amber-950/40 border border-amber-600/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Exclusive Draft Rule:</strong> Once any manager claims a footballer, that player is permanently locked from the pool and cannot be drafted by anyone else!
              </span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={handleToggleReady}
                className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                  currentMember?.ready
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                }`}
              >
                {currentMember?.ready ? 'Cancel Ready' : 'Mark Ready'}
              </button>

              {isHost ? (
                <button
                  onClick={handleStartDraftClick}
                  disabled={currentRoom.members.length < (currentRoom.mode === '1v1' ? 2 : 2)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2 cursor-pointer transition"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Multiplayer Draft</span>
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Waiting for host to start draft...
                </div>
              )}
            </div>
          </div>
        ) : (
          /* View 2: Host or Join Tabs */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setTab('HOST')}
                className={`py-2.5 rounded-xl text-xs font-bold tracking-wider transition uppercase ${
                  tab === 'HOST'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Host Room
              </button>
              <button
                onClick={() => setTab('JOIN')}
                className={`py-2.5 rounded-xl text-xs font-bold tracking-wider transition uppercase ${
                  tab === 'JOIN'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join Room
              </button>
            </div>

            {tab === 'HOST' ? (
              <div className="space-y-5">
                {/* Mode Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Select Competition Format
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('1v1')}
                      className={`p-4 rounded-2xl border text-left transition ${
                        mode === '1v1'
                          ? 'border-red-500 bg-red-950/40 shadow-lg'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <Swords className="w-5 h-5 text-red-400 mb-2" />
                      <div className="font-bold text-sm text-white">1v1 Cup Final</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Turn-based draft, side-by-side squad build & direct match battle.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('TOURNAMENT_4')}
                      className={`p-4 rounded-2xl border text-left transition ${
                        mode === 'TOURNAMENT_4'
                          ? 'border-red-500 bg-red-950/40 shadow-lg'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <Trophy className="w-5 h-5 text-amber-400 mb-2" />
                      <div className="font-bold text-sm text-white">Full Cup (4 Teams)</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Semi-Finals knockout bracket against friends.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('TOURNAMENT_8')}
                      className={`p-4 rounded-2xl border text-left transition ${
                        mode === 'TOURNAMENT_8'
                          ? 'border-red-500 bg-red-950/40 shadow-lg'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <Users className="w-5 h-5 text-emerald-400 mb-2" />
                      <div className="font-bold text-sm text-white">Full Cup (8 Teams)</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Quarter-Finals bracket tournament for groups.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom Room Code (Optional) */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Custom Room Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FINAL2026, CHAMP, DERBY"
                    maxLength={10}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-athletic font-bold uppercase tracking-wider"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Leave blank to automatically generate a unique code (e.g. RCL-482).
                  </span>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>{loading ? 'Creating Room...' : 'Create Private Room'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    Enter Friend's Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RCL-482 or FINAL2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-athletic font-bold uppercase tracking-wider"
                  />
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>{loading ? 'Joining...' : 'Join Draft Room'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
