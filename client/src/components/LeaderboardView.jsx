// client/src/components/LeaderboardView.jsx
// Live Authoritative Leaderboard Component with Real-Time Reordering & Deterministic Ties

import React, { useState, useEffect } from 'react';
import { Award, Trophy, Shield, RefreshCw, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function LeaderboardView({
  isOpen,
  onClose,
  sessionId = 'default-cyber-session',
  initialLeaderboard = [],
  sessionStatus = 'RUNNING',
  isPaused = false,
  timing = null,
  realtimeStatus = 'CONNECTED' // CONNECTED, RECONNECTING, ERROR, DISCONNECTED
}) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      setError('Unable to fetch live standings. Reconnecting...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLeaderboard && initialLeaderboard.length > 0) {
      setLeaderboard(initialLeaderboard);
    } else {
      fetchLeaderboard();
    }
  }, [initialLeaderboard]);

  if (!isOpen) return null;

  const formatSeconds = (sec) => {
    if (!sec && sec !== 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col relative text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/80 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950">
              <Trophy className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                  Authoritative Standings
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded font-bold border ${
                  realtimeStatus === 'CONNECTED' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                  realtimeStatus === 'RECONNECTING' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                  'bg-rose-950 text-rose-400 border-rose-800'
                }`}>
                  {realtimeStatus}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-white">LIVE SQUAD LEADERBOARD</h3>
            </div>
          </div>

          <button
            onClick={() => { playClick(); fetchLeaderboard(); }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
            title="Refresh Standings"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Match Timing & Status HUD */}
        {timing && (
          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <div>
              <span className="text-slate-500 block text-[10px]">ACTIVE GAMEPLAY</span>
              <span className="font-bold text-cyan-400">{formatSeconds(timing.activeGameplaySeconds)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">TOTAL PAUSED</span>
              <span className="font-bold text-amber-400">{formatSeconds(timing.pausedSeconds)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">MATCH STATUS</span>
              <span className={`font-bold ${isPaused ? 'text-amber-400 animate-pulse' : sessionStatus === 'COMPLETED' ? 'text-slate-400' : 'text-emerald-400'}`}>
                {isPaused ? 'PAUSED' : sessionStatus}
              </span>
            </div>
          </div>
        )}

        {/* Error / Alert banner */}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No squad scores recorded yet for this session.
            </div>
          ) : (
            leaderboard.map((team, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={team.teamId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isFirst ? 'bg-amber-950/30 border-amber-500/80 shadow-md shadow-amber-950/20' :
                    isSecond ? 'bg-slate-800/40 border-slate-600' :
                    isThird ? 'bg-amber-900/10 border-amber-800/40' :
                    'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isFirst ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/50' :
                      isSecond ? 'bg-slate-300 text-slate-950' :
                      isThird ? 'bg-amber-700 text-white' :
                      'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}>
                      #{team.rank}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <span>{team.teamName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({team.teamId})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Levels Done: {team.completedLevels || 0}</span>
                        <span>•</span>
                        <span className={team.integrity > 50 ? 'text-cyan-400' : 'text-rose-400'}>
                          Integrity: {team.integrity}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-base text-emerald-400">
                      +{team.score} <span className="text-[10px] text-emerald-500">PTS</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      team.isEliminated ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                      'bg-emerald-950 text-emerald-400 border border-emerald-900'
                    }`}>
                      {team.completionStatus || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Deterministic Ties: Score &gt; Levels &gt; Timestamp</span>
          <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
        </div>

      </div>
    </div>
  );
}
