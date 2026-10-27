// client/src/components/LeaderboardView.jsx
// Live Authoritative Leaderboard Component with Real-Time Reordering & Deterministic Ties

import React, { useState, useEffect } from 'react';
import { Award, Trophy, Shield, RefreshCw, AlertTriangle, CheckCircle2, Clock, X, Lock, Check, Monitor } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function LeaderboardView({
  isOpen,
  onClose,
  sessionId = 'default-cyber-session',
  initialLeaderboard = [],
  gameState = null,
  myTeam = null,
  sessionStatus = 'RUNNING',
  isPaused = false,
  timing = null,
  elapsedSeconds = 0,
  realtimeStatus = 'CONNECTED'
}) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const buildLocalLeaderboard = () => {
    const baseSquads = [
      { id: 'C01', name: 'Cyber Alpha' },
      { id: 'C02', name: 'Grid Shield' },
      { id: 'C03', name: 'Neural Sentinel' },
      { id: 'C04', name: 'Binary Vanguard' },
      { id: 'C05', name: 'Quantum Watch' },
      { id: 'C06', name: 'Dark Matrix' },
      { id: 'C07', name: 'Cipher Guard' },
      { id: 'C08', name: 'Aegis Core' }
    ];

    const sourceTeams = (gameState?.teams && gameState.teams.length > 0)
      ? gameState.teams
      : baseSquads;

    const myScore = myTeam?.score || 0;
    const myId = myTeam?.id || 'C01';
    const completedStagesCount = gameState?.completedStages?.length || 0;
    const activeSysNo = localStorage.getItem('cyber_mafia_system_no') || myTeam?.systemNo || 'SYS-01';

    const mapped = sourceTeams.map(t => {
      const isMe = t.id === myId || t.suspectId === myId;
      const score = isMe ? Math.max(t.score || 0, myScore) : (t.score || 0);
      const levelsDone = isMe ? completedStagesCount : (t.completedLevels || 0);
      return {
        teamId: t.id,
        teamName: isMe && myTeam?.name ? myTeam.name : (t.name || `Squad ${t.id}`),
        score,
        completedLevels: levelsDone,
        systemNo: isMe ? activeSysNo : `SYS-${t.id}`,
        integrity: t.integrity || 100,
        isEliminated: t.isEliminated || false,
        completionStatus: levelsDone >= 5 ? 'COMPLETED' : 'IN_PROGRESS'
      };
    });

    mapped.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.completedLevels !== a.completedLevels) return b.completedLevels - a.completedLevels;
      return a.teamId.localeCompare(b.teamId);
    });

    return mapped.map((t, idx) => ({ ...t, rank: idx + 1 }));
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard && data.leaderboard.length > 0) {
          // Merge local player's latest score if higher to ensure no lag
          const myId = myTeam?.id;
          const myScore = myTeam?.score || 0;
          const merged = data.leaderboard.map(t => {
            if (t.teamId === myId && myScore > (t.score || 0)) {
              return { ...t, score: myScore };
            }
            return t;
          });
          merged.sort((a, b) => (b.score || 0) - (a.score || 0));
          setLeaderboard(merged.map((t, i) => ({ ...t, rank: i + 1 })));
          setLastRefreshed(new Date());
          return;
        }
      }
      // If API returned empty, fallback to local authoritative list
      setLeaderboard(buildLocalLeaderboard());
      setLastRefreshed(new Date());
    } catch (err) {
      // Offline / standalone fallback
      setLeaderboard(buildLocalLeaderboard());
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLeaderboard && initialLeaderboard.length > 0) {
      setLeaderboard(initialLeaderboard);
    } else {
      setLeaderboard(buildLocalLeaderboard());
      fetchLeaderboard();
    }
  }, [initialLeaderboard, myTeam?.score, gameState?.completedStages?.length]);

  // Polling every 5 seconds for live round and time updates
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const formatSeconds = (sec) => {
    const total = Math.max(0, sec || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-4xl w-full bg-slate-900 border border-amber-600/60 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col relative text-slate-100">
        
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500/80 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950">
              <Trophy className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-950 border border-amber-600 text-amber-300 px-2 py-0.5 rounded uppercase tracking-widest font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> ADMIN ONLY // LIVE LEADERBOARD
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  realtimeStatus === 'CONNECTED' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                  realtimeStatus === 'RECONNECTING' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                  'bg-slate-900 text-cyan-300 border-cyan-800'
                }`}>
                  {realtimeStatus}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-white mt-0.5">AUTHORITATIVE SQUAD STANDINGS</h3>
            </div>
          </div>

          <button
            onClick={() => { playClick(); fetchLeaderboard(); }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer shadow"
            title="Refresh Standings"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Match Stopwatch & Status HUD */}
        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <div>
            <span className="text-slate-500 block text-[10px]">STOPWATCH DURATION</span>
            <span className="font-bold text-cyan-400 font-mono">
              {formatSeconds(elapsedSeconds || timing?.activeGameplaySeconds)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">CURRENT STATION</span>
            <span className="font-bold text-amber-400 font-mono">
              {localStorage.getItem('cyber_mafia_system_no') || myTeam?.systemNo || 'SYS-01'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">MATCH STATUS</span>
            <span className={`font-bold ${isPaused ? 'text-amber-400 animate-pulse' : sessionStatus === 'COMPLETED' ? 'text-slate-400' : 'text-emerald-400'}`}>
              {isPaused ? 'PAUSED' : sessionStatus}
            </span>
          </div>
        </div>

        {/* Error / Alert banner if any */}
        {error && (
          <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Initializing squad leaderboard...
            </div>
          ) : (
            leaderboard.map((team, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;
              const isMe = team.teamId === myTeam?.id;

              return (
                <div
                  key={team.teamId}
                  className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                    isMe
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                      : isFirst ? 'bg-amber-950/30 border-amber-500/80 shadow-md shadow-amber-950/20' :
                    isSecond ? 'bg-slate-800/40 border-slate-600' :
                    isThird ? 'bg-amber-900/10 border-amber-800/40' :
                    'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
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
                        {isMe && (
                          <span className="text-[9px] bg-cyan-900 text-cyan-300 px-1.5 py-0.2 rounded font-bold uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-mono">
                        <span className="text-cyan-300 font-mono flex items-center gap-1">
                          <Monitor className="w-3 h-3 text-cyan-400" />
                          {team.systemNo || `SYS-${team.teamId}`}
                        </span>
                        <span>•</span>
                        <span>Stages Done: {team.completedLevels || 0}/5</span>
                        <span>•</span>
                        <span className="text-amber-300 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" /> Time: {team.timeFormatted || `${elapsedSeconds}s`}
                        </span>
                        <span>•</span>
                        <span className={team.integrity > 50 ? 'text-emerald-400' : 'text-rose-400'}>
                          Integrity: {team.integrity}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3 ml-auto">
                    <div>
                      <div className="font-black text-base text-emerald-400 font-mono">
                        +{team.score || 0} <span className="text-[10px] text-emerald-500">PTS</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {team.hasSubmitted && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> SUBMITTED ({team.accusationScore ?? 0}/5)
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          team.isEliminated ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                          (team.completedLevels >= 5) ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                          'bg-emerald-950 text-emerald-400 border border-emerald-900'
                        }`}>
                          {team.isEliminated ? 'ELIMINATED' : (team.completedLevels >= 5 ? 'COMPLETED' : (team.completionStatus || 'ACTIVE'))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>Ranking Hierarchy: Score DESC &gt; Stages Completed DESC &gt; Time Taken ASC</span>
          <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
        </div>

      </div>
    </div>
  );
}
