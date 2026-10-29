// client/src/components/FullScreenLeaderboard.jsx
// Dedicated Full-Screen Live Leaderboard for Projector, Auditorium Screen & Large Displays
// Read-only, Public-Safe, 16:9 Optimized, High-Contrast Typography, Auto-Synced via Authoritative Backend

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Award, Shield, RefreshCw, Clock, Monitor, 
  Users, Maximize, Minimize, CheckCircle2, AlertTriangle, 
  Radio, Sparkles, Terminal
} from 'lucide-react';

export default function FullScreenLeaderboard({ sessionId = 'default-cyber-session' }) {
  // Read query params for session override or custom branding
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const effectiveSessionId = urlParams.get('sessionId') || sessionId || 'default-cyber-session';

  const [leaderboard, setLeaderboard] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('RUNNING');
  const [isPaused, setIsPaused] = useState(false);
  const [timing, setTiming] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [syncStatus, setSyncStatus] = useState('CONNECTING'); // 'CONNECTED' | 'RETRYING' | 'CONNECTING'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previousRanks, setPreviousRanks] = useState({});

  const abortControllerRef = useRef(null);

  // Authoritative Leaderboard Fetcher
  const fetchLeaderboard = async (isManual = false) => {
    // Avoid fetching if page tab is completely hidden, unless triggered manually
    if (!isManual && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?sessionId=${encodeURIComponent(effectiveSessionId)}&_t=${Date.now()}`,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok) {
        const data = await res.json();
        const incomingList = Array.isArray(data.leaderboard) ? data.leaderboard : [];

        // Track rank shifts for subtle animations
        setPreviousRanks(prev => {
          const map = { ...prev };
          incomingList.forEach(item => {
            map[item.teamId] = item.rank;
          });
          return map;
        });

        setLeaderboard(incomingList);
        setSessionStatus(data.sessionStatus || 'RUNNING');
        setIsPaused(Boolean(data.isPaused));
        if (data.timing) setTiming(data.timing);
        setLastUpdated(new Date());
        setSyncStatus('CONNECTED');
      } else {
        setSyncStatus('RETRYING');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSyncStatus('RETRYING');
      }
    } finally {
      setLoading(false);
    }
  };

  // Full-Screen Toggle
  const toggleFullScreen = () => {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed:', e);
    }
  };

  // Listen for native fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Polling setup: 6-second interval (fits 5-8s spec), pause on hidden tab, fresh fetch on visible
  useEffect(() => {
    fetchLeaderboard(true);

    const interval = setInterval(() => {
      fetchLeaderboard(false);
    }, 6000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [effectiveSessionId]);

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const total = Math.max(0, secs || 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Active match gameplay duration
  const activeSeconds = timing?.activeGameplaySeconds ?? 0;

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 lg:p-12 font-mono selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden relative cyber-grid">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER CLUSTER (16:9 Optimized) */}
      <header className="z-10 w-full mb-6 pb-6 border-b border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title & Branding */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs md:text-sm font-bold uppercase tracking-widest shadow-lg shadow-cyan-950/50 mb-2">
            <Terminal className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>init Association // FALSE TRIALS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-1" />
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-slate-100 to-amber-400 tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-amber-400 inline shrink-0" />
            LIVE LEADERBOARD
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-mono">
            Authoritative Standings & Real-Time Telemetry &bull; Session: <span className="text-cyan-400 font-bold">{effectiveSessionId}</span>
          </p>
        </div>

        {/* Telemetry & Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Match Status */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs md:text-sm shadow-md">
            <span className="text-slate-400 uppercase text-[11px] font-bold">Match State:</span>
            {isPaused ? (
              <span className="px-2 py-0.5 rounded font-black text-amber-400 bg-amber-950/80 border border-amber-800/80 animate-pulse">
                PAUSED
              </span>
            ) : sessionStatus === 'COMPLETED' ? (
              <span className="px-2 py-0.5 rounded font-black text-cyan-300 bg-cyan-950/80 border border-cyan-800/80">
                COMPLETED
              </span>
            ) : sessionStatus === 'RUNNING' ? (
              <span className="px-2 py-0.5 rounded font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE MATCH
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-bold text-slate-300 bg-slate-800">
                {sessionStatus || 'LOBBY'}
              </span>
            )}
          </div>

          {/* Active Timer */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs md:text-sm shadow-md">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-[11px] font-bold uppercase">Time:</span>
            <span className="font-mono font-black text-white text-sm md:text-base tracking-wider">
              {formatTime(activeSeconds)}
            </span>
          </div>

          {/* Sync Connection Badge */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs shadow-md">
            {syncStatus === 'CONNECTED' ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span>LIVE SYNC</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>SYNCING...</span>
              </div>
            )}
            {lastUpdated && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                ({lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
            title="Refresh Standings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Full-Screen Toggle Button */}
          <button
            onClick={toggleFullScreen}
            className="p-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 hover:text-white transition-all cursor-pointer shadow-md"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Projector Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT: STANDINGS DISPLAY */}
      <main className="z-10 flex-1 flex flex-col justify-start">
        {leaderboard.length === 0 ? (
          /* Clean Empty State: No Mock Data */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 md:p-16 rounded-3xl bg-slate-900/60 border border-slate-800/80 my-auto shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-6 shadow-xl shadow-cyan-950/50">
              <Radio className="w-10 h-10 animate-pulse text-cyan-400" />
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
              NO ACTIVE SQUADS IN SESSION
            </h2>
            <p className="text-slate-400 max-w-lg text-sm md:text-base leading-relaxed mb-6 font-mono">
              Waiting for squads to connect and join the investigation. Squad stations and live forensic scores will populate automatically upon registration.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              Continuous backend polling active (6s interval) &bull; Zero manual refresh required
            </div>
          </div>
        ) : (
          /* Populated Standings: High-Contrast Table / Cards */
          <div className="space-y-3.5">
            {/* Column Header Bar */}
            <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-5 md:col-span-5">Squad Identity & Station</div>
              <div className="col-span-2 text-center hidden md:block">Forensic Progress</div>
              <div className="col-span-2 text-center hidden md:block">Accusation Status</div>
              <div className="col-span-4 md:col-span-2 text-right">Authoritative Score</div>
            </div>

            {/* Squad Rows */}
            {leaderboard.map((team, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              // Luxury styling for Top 3
              let cardBg = 'bg-slate-900/80 border-slate-800 hover:border-slate-700';
              let rankBadge = 'bg-slate-800 text-slate-300 border-slate-700';
              let scoreColor = 'text-white';

              if (isTop1) {
                cardBg = 'bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-slate-900/90 border-amber-500/80 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/40';
                rankBadge = 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 border-amber-300 font-black';
                scoreColor = 'text-amber-400 font-black';
              } else if (isTop2) {
                cardBg = 'bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-slate-900/90 border-cyan-500/70 shadow-lg shadow-cyan-950/30';
                rankBadge = 'bg-gradient-to-br from-cyan-300 to-cyan-500 text-slate-950 border-cyan-200 font-black';
                scoreColor = 'text-cyan-300 font-black';
              } else if (isTop3) {
                cardBg = 'bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-900/90 border-emerald-500/70 shadow-lg shadow-emerald-950/30';
                rankBadge = 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 border-emerald-300 font-black';
                scoreColor = 'text-emerald-400 font-black';
              }

              return (
                <div
                  key={team.teamId}
                  className={`grid grid-cols-12 gap-3 items-center px-4 md:px-6 py-3.5 md:py-4 rounded-2xl border transition-all duration-300 ${cardBg}`}
                >
                  {/* Rank Column */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className={`w-8 h-8 md:w-11 md:h-11 rounded-xl border flex items-center justify-center font-mono text-sm md:text-xl shadow-inner ${rankBadge}`}>
                      {isTop1 ? <Trophy className="w-4 h-4 md:w-6 md:h-6" /> : `#${rank}`}
                    </div>
                  </div>

                  {/* Squad Name & System Station */}
                  <div className="col-span-5 md:col-span-5 flex flex-col justify-center min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base md:text-2xl font-black text-white tracking-wide truncate">
                        {team.teamName}
                      </span>
                      {isTop1 && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 uppercase">
                          <Sparkles className="w-3 h-3" /> Leading
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                        {team.systemNo || `SYS-${team.teamId}`}
                      </span>
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        ID: {team.teamId}
                      </span>
                    </div>
                  </div>

                  {/* Forensic Progress */}
                  <div className="col-span-2 text-center hidden md:flex flex-col items-center justify-center">
                    <div className="text-xs font-bold text-slate-200">
                      STAGE {team.completedLevels || 0} / 5
                    </div>
                    {/* Visual 5-Stage Pip Tracker */}
                    <div className="flex items-center gap-1 mt-1.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <span
                          key={lvl}
                          className={`w-2.5 h-2.5 rounded-sm border ${
                            lvl <= (team.completedLevels || 0)
                              ? 'bg-cyan-400 border-cyan-300 shadow-sm shadow-cyan-400'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Accusation / Verdict Status */}
                  <div className="col-span-2 text-center hidden md:flex flex-col items-center justify-center">
                    {team.hasSubmitted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/80 border border-purple-800 text-purple-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                        VERDICT FILED
                      </span>
                    ) : team.isEliminated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 border border-rose-800 text-rose-300">
                        ELIMINATED
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">
                        INVESTIGATING
                      </span>
                    )}
                    {team.timeFormatted && team.timeFormatted !== '0s' && (
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Time: {team.timeFormatted}
                      </span>
                    )}
                  </div>

                  {/* Authoritative Score */}
                  <div className="col-span-6 md:col-span-2 flex flex-col items-end justify-center">
                    <div className={`text-2xl md:text-4xl lg:text-5xl font-mono tracking-tight ${scoreColor}`}>
                      {team.score > 0 ? `+${team.score}` : team.score}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      POINTS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER TELEMETRY STRIP */}
      <footer className="z-10 mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>FALSE TRIALS TELEMETRY ENGINE &bull; DEDICATED PROJECTOR STANDINGS</span>
        </div>
        <div className="flex items-center gap-3">
          <span>TIE-BREAKER: SCORE &bull; STAGES SOLVED &bull; TIME ELAPSED</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-cyan-400 font-bold">STRICT DATABASE SOURCE OF TRUTH</span>
        </div>
      </footer>
    </div>
  );
}
