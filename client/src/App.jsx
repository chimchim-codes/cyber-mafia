// client/src/App.jsx
// Main Application Component with Supabase Realtime, Persistent Session Reconnection, Leaderboard, and Dr. Adrian Vale Murder Investigation
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import { 
  Shield, Skull, Terminal, Volume2, VolumeX, Settings, 
  Clock, Award, Trophy, Radio, AlertTriangle, Play, Pause, HelpCircle, X, Maximize,
  Monitor, LogOut
} from 'lucide-react';

import LandingLobby from './components/LandingLobby';
import RoleRevealModal from './components/RoleRevealModal';
import HackerDashboard from './components/HackerDashboard';
import CivilianDashboard from './components/CivilianDashboard';
import AccusationModal from './components/AccusationModal';
import DefencePhaseModal from './components/DefencePhaseModal';
import RevealModal from './components/RevealModal';
import AdminPanel from './components/AdminPanel';
import LeaderboardView from './components/LeaderboardView';
import FullScreenLeaderboard from './components/FullScreenLeaderboard';
import { generateTribunalAccusationPDF } from './utils/pdfGenerator';

import { 
  INITIAL_SUSPECTS, 
  PYTHON_CHALLENGES, 
  ALL_EVIDENCE_FILES, 
  createInitialGameState,
  loadSavedGameState
} from './data/caseData';

import { toggleSound, playClick, playSuccess, playError, playAlarm, initAudio } from './utils/soundEffects';
import { executePythonCode } from './utils/pythonRunner';

// Format seconds into MM:SS
export const formatMinutesSeconds = (totalSec) => {
  const m = Math.floor(Math.max(0, totalSec || 0) / 60);
  const s = Math.max(0, totalSec || 0) % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Setup Supabase Client for Public Realtime Subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Socket.IO configuration:
// 1. If VITE_SERVER_URL or VITE_SOCKET_URL is set, connect to that persistent backend.
// 2. In local development on localhost/127.0.0.1, connect to the local Node server (http://localhost:3001).
// 3. On Vercel / serverless production WITHOUT a separate persistent backend, do NOT attempt
//    WebSocket connection to the Vercel domain (Vercel serverless functions do not support WebSockets).
//    Instead, the application operates in serverless mode with Supabase Realtime & HTTP APIs.
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);
const customServerUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_SOCKET_URL || '').trim();
const targetSocketUrl = customServerUrl
  ? customServerUrl
  : (isLocalhost ? (window.location.port === '3001' ? window.location.origin : 'http://localhost:3001') : null);

let socket = null;
if (targetSocketUrl) {
  try {
    socket = io(targetSocketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3, // Prevent infinite reconnection failure loops
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 4000
    });
    socket.on('connect_error', (err) => {
      console.warn(`[Socket.IO] Backend at ${targetSocketUrl} is unreachable: ${err.message}. Operating in serverless API mode.`);
    });
  } catch (e) {
    console.warn('Socket connection not initialized:', e);
  }
}

const DEFAULT_SESSION_ID = 'default-cyber-session';

// Safe network fetch with timeout and cancellation support to prevent hung requests / net::ERR_TIMED_OUT
export async function safeApiFetch(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer);
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Preserve local forensic challenges and progression when merging server state
function mergeServerStateWithLocal(serverState, prevState) {
  if (!serverState) return prevState;

  // Check if dynamic squad was wiped by an administrator reset
  const isSquadWipedByReset = prevState?.phase === 'CIVILIAN_PHASE' &&
    prevState?.myTeam?.id &&
    serverState?.phase === 'LOBBY' &&
    !serverState?.myTeam &&
    !serverState?.teams?.some(t => t.id === prevState.myTeam.id);

  // A player is actively investigating if local state or server state is in CIVILIAN_PHASE
  const isPlayingCivilian = !isSquadWipedByReset && (prevState?.phase === 'CIVILIAN_PHASE' || serverState?.phase === 'CIVILIAN_PHASE');

  const challenges = (serverState.challenges && Array.isArray(serverState.challenges) && serverState.challenges.length > 0)
    ? serverState.challenges
    : (prevState?.challenges && Array.isArray(prevState.challenges) && prevState.challenges.length > 0
        ? prevState.challenges
        : PYTHON_CHALLENGES);

  const completedStages = Array.from(new Set([
    ...(prevState?.completedStages || []),
    ...(serverState.completedStages || [])
  ])).sort((a, b) => a - b);

  const prevStage = Number(prevState?.currentStage) || 1;
  const serverStage = Number(serverState?.currentStage) || 1;
  const derivedStage = completedStages.length > 0 ? Math.min(Math.max(...completedStages) + 1, 5) : 1;
  const currentStage = Math.max(prevStage, serverStage, derivedStage);

  const unlockedEvidenceBatches = Array.from(new Set([
    ...(prevState?.unlockedEvidenceBatches || [1]),
    ...(serverState.unlockedEvidenceBatches || [1]),
    ...completedStages.map(stg => Math.min(stg + 1, 6))
  ])).sort((a, b) => a - b);

  return {
    ...prevState,
    ...serverState,
    phase: isPlayingCivilian ? 'CIVILIAN_PHASE' : (serverState.phase || prevState?.phase || 'LOBBY'),
    status: isPlayingCivilian ? (serverState.status === 'PAUSED' ? 'PAUSED' : 'RUNNING') : (serverState.status || prevState?.status || 'NOT_STARTED'),
    isPaused: Boolean(serverState.isPaused),
    challenges,
    currentStage,
    completedStages,
    unlockedEvidenceBatches,
    hintsRemaining: serverState.hintsRemaining ?? prevState?.hintsRemaining ?? 3,
    hintsUsedPerChallenge: serverState.hintsUsedPerChallenge || prevState?.hintsUsedPerChallenge || {},
    systemLogs: (serverState.systemLogs && serverState.systemLogs.length > 0)
      ? serverState.systemLogs
      : (prevState?.systemLogs || [])
  };
}

export default function App() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION_ID);
  const hasEnteredFullscreenRef = useRef(false);

  // Dedicated Full-Screen Live Leaderboard Route for Projector, Auditorium & Large Displays
  const isLeaderboardRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/leaderboard' ||
    window.location.pathname === '/live-leaderboard' ||
    window.location.search.includes('view=projector') ||
    window.location.search.includes('mode=leaderboard')
  );

  if (isLeaderboardRoute) {
    return <FullScreenLeaderboard sessionId={sessionId} />;
  }
  
  // Restore game state from localStorage so reload maintains all progress
  const [gameState, setGameState] = useState(() => {
    const saved = loadSavedGameState();
    return saved || createInitialGameState();
  });

  // Restore player details & unlocked evidence
  const [myTeam, setMyTeam] = useState(() => {
    const savedTeamId = localStorage.getItem('cyber_mafia_team_id') || 'SQ_01';
    const savedPlayerName = localStorage.getItem('cyber_mafia_player_name') || '';
    const savedTeamName = localStorage.getItem('cyber_mafia_team_name') || savedPlayerName;
    const savedState = loadSavedGameState();
    const targetSuspect = INITIAL_SUSPECTS.find(s => s.id === savedTeamId) || INITIAL_SUSPECTS[0];
    const unlockedBatches = savedState?.unlockedEvidenceBatches || [1];

    return {
      ...targetSuspect,
      id: savedTeamId,
      name: savedTeamName || targetSuspect.name,
      playerName: savedPlayerName || targetSuspect.name,
      score: savedState?.score || 0,
      visibleEvidence: ALL_EVIDENCE_FILES.filter(e => unlockedBatches.includes(e.batch))
    };
  });

  // Handle player removal by administrator
  const handlePlayerRemovedByAdmin = (reason) => {
    try {
      localStorage.removeItem('cyber_mafia_team_id');
      localStorage.removeItem('cyber_mafia_player_name');
      localStorage.removeItem('cyber_mafia_team_name');
      localStorage.removeItem('cyber_mafia_start_time');
      localStorage.removeItem('cyber_mafia_game_state');
    } catch (_) {}
    setGameState(createInitialGameState());
    setMyTeam(null);
    alert(`MATCH TERMINATED:\n\n${reason || 'You have been removed from the session by an administrator.'}\n\nYou have been returned to the station lobby.`);
  };

  // Track how many minutes/seconds the game has taken so far
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const savedStart = localStorage.getItem('cyber_mafia_start_time');
    if (savedStart) {
      return Math.max(0, Math.floor((Date.now() - Number(savedStart)) / 1000));
    }
    return 0;
  });

  // Fullscreen lockdown & Anti-cheat security violations
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('cyber_mafia_security_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Chronological Audit Trail of logins, window movements/breaches, and solves
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('cyber_mafia_audit_trail');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [submissionAlerts, setSubmissionAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('cyber_mafia_submission_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [adminKey, setAdminKey] = useState(
    () => localStorage.getItem('cyber_mafia_admin_key') || ''
  );
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem('cyber_mafia_is_admin') === 'true' && Boolean(localStorage.getItem('cyber_mafia_admin_key'))
  );
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [soundOn, setSoundOn] = useState(true);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAccusationModal, setShowAccusationModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Hints unlocked per location: { [locationId]: hintText }
  const [unlockedHints, setUnlockedHints] = useState({});

  // Custom Verdict state with timestamp
  const [customVerdict, setCustomVerdict] = useState(null);

  // Active Hacker Challenge in progress
  const [activeAttackChallenge, setActiveAttackChallenge] = useState(null);

  // Status banners / toasts
  const [notification, setNotification] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState(supabase ? 'CONNECTING' : 'OFFLINE');

  // Start time tracker for standalone timestamps
  const startTimeRef = useRef(new Date());

  const showToast = (message, type = 'INFO') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdminLogin = async (key) => {
    localStorage.setItem('cyber_mafia_admin_key', key);
    localStorage.setItem('cyber_mafia_is_admin', 'true');
    setAdminKey(key);
    setIsAdmin(true);
    setAuthError(null);
    showToast('Admin authenticated successfully', 'SUCCESS');
    refreshGameState();
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('cyber_mafia_admin_key');
    localStorage.setItem('cyber_mafia_is_admin', 'false');
    setAdminKey('');
    setIsAdmin(false);
    setShowAdminPanel(false);
    showToast('Admin logged out', 'INFO');
  };

  // Authoritative State Fetcher
  const refreshGameState = async (teamId = null) => {
    const activeTeamId = teamId || myTeam?.id || localStorage.getItem('cyber_mafia_team_id');
    const keyToUse = adminKey.trim() || localStorage.getItem('cyber_mafia_admin_key') || '';
    try {
      const headers = {};
      if (keyToUse) {
        headers['x-admin-key'] = keyToUse;
      }
      const res = await safeApiFetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}${activeTeamId ? `&teamId=${activeTeamId}` : ''}`, {
        headers
      });
      if (res.ok) {
        const state = await res.json();
        if (state.myTeam && (state.myTeam.status === 'REMOVED_BY_ADMIN' || (state.myTeam.is_eliminated && state.myTeam.removal_reason))) {
          handlePlayerRemovedByAdmin(state.myTeam.removal_reason);
          return;
        }
        setGameState(prev => mergeServerStateWithLocal(state, prev));
        if (state.myTeam) {
          setMyTeam(prev => ({ ...prev, ...state.myTeam }));
        }
      }
    } catch (err) {
      console.warn('State sync poll error:', err);
    }
  };

  // Initial Load & Reconnection Recovery
  useEffect(() => {
    const savedTeamId = localStorage.getItem('cyber_mafia_team_id');
    const savedPlayerName = localStorage.getItem('cyber_mafia_player_name');

    if (savedTeamId) {
      safeApiFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECONNECT',
          sessionId,
          teamId: savedTeamId,
          playerName: savedPlayerName
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.state) {
          setGameState(prev => mergeServerStateWithLocal(data.state, prev));
          if (data.state.myTeam) setMyTeam(prev => ({ ...prev, ...data.state.myTeam }));
          showToast(`Reconnected to Squad ${savedTeamId}`, 'SUCCESS');
        }
      })
      .catch(() => refreshGameState(savedTeamId));
    } else {
      refreshGameState();
    }
  }, [sessionId]);

  // Supabase Realtime Channel Subscription
  useEffect(() => {
    if (!supabase) {
      setRealtimeStatus('OFFLINE');
      return;
    }

    setRealtimeStatus('CONNECTING');
    const channel = supabase
      .channel(`cyber_mafia_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        () => refreshGameState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        () => refreshGameState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events', filter: `session_id=eq.${sessionId}` },
        () => refreshGameState()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('CONNECTED');
          refreshGameState();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('RECONNECTING');
        } else if (status === 'TIMED_OUT') {
          setRealtimeStatus('DISCONNECTED');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myTeam?.id]);

  // -------------------------------------------------------------------------
  // Reliable Cross-Device State Synchronization (Vercel Serverless Compatible)
  // Polls /api/session every 6 seconds (within 5-8s spec), handles tab visibility,
  // uses AbortController to cancel overlapping in-flight requests and cleans up on unmount.
  // -------------------------------------------------------------------------
  const stateAbortRef = useRef(null);

  useEffect(() => {
    const syncAuthoritativeState = async () => {
      // Pause polling while tab is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      if (stateAbortRef.current) {
        stateAbortRef.current.abort();
      }
      stateAbortRef.current = new AbortController();

      const activeTeamId = myTeam?.id || localStorage.getItem('cyber_mafia_team_id');
      const keyToUse = adminKey.trim() || localStorage.getItem('cyber_mafia_admin_key') || '';
      try {
        const headers = {};
        if (keyToUse) {
          headers['x-admin-key'] = keyToUse;
        }
        const res = await safeApiFetch(
          `/api/session?sessionId=${encodeURIComponent(sessionId)}${activeTeamId ? `&teamId=${activeTeamId}` : ''}`,
          {
            headers,
            signal: stateAbortRef.current.signal
          },
          6000
        );
        if (res && res.ok) {
          const state = await res.json();
          if (state.myTeam && (state.myTeam.status === 'REMOVED_BY_ADMIN' || (state.myTeam.is_eliminated && state.myTeam.removal_reason))) {
            handlePlayerRemovedByAdmin(state.myTeam.removal_reason);
            return;
          }
          setGameState(prev => mergeServerStateWithLocal(state, prev));
          if (state.myTeam) {
            setMyTeam(prev => ({ ...prev, ...state.myTeam }));
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Intermittent network error handled gracefully
        }
      }
    };

    // 6-second polling interval
    const interval = setInterval(syncAuthoritativeState, 6000);

    // Immediate authoritative fetch when hidden tab becomes visible again
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        refreshGameState();
      }
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      clearInterval(interval);
      if (stateAbortRef.current) {
        stateAbortRef.current.abort();
      }
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [sessionId, myTeam?.id, adminKey]);

  // Socket Fallback Events
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('Connected to Cyber Forensics server. Socket ID:', socket.id);
    });

    socket.on('game_state_update', (state) => {
      if (state) {
        setGameState(prev => mergeServerStateWithLocal(state, prev));
        if (state.myTeam) setMyTeam(prev => ({ ...prev, ...state.myTeam }));
        if (state.phase === 'ROLE_ASSIGNMENT') setShowRoleModal(true);
        if (state.phase === 'DEFENCE_PHASE') playAlarm();
      }
    });

    socket.on('joined_team_success', ({ team, isAdmin: adminStatus }) => {
      if (team) setMyTeam(team);
      if (adminStatus !== undefined) setIsAdmin(adminStatus);
    });

    socket.on('attack_challenge_ready', (challenge) => {
      setActiveAttackChallenge(challenge);
      showToast(`Challenge ready: ${challenge.title}`, 'SUCCESS');
    });

    socket.on('attack_result', (result) => {
      if (result.success) {
        playSuccess();
        showToast(result.message, 'SUCCESS');
        setActiveAttackChallenge(null);
      } else {
        playError();
        showToast(result.message, 'ERROR');
      }
    });

    socket.on('ctf_lab_result', (result) => {
      if (result.success) {
        playSuccess();
        showToast(result.message, 'SUCCESS');
      } else {
        playError();
        showToast(result.message, 'ERROR');
      }
    });

    socket.on('location_hint_result', (result) => {
      if (result.success) {
        playSuccess();
        setUnlockedHints(prev => ({ ...prev, [result.locationId]: result.hint }));
        showToast(`Hint unlocked (${result.hintsRemaining} remaining)`, 'SUCCESS');
      } else {
        playError();
        showToast(result.message, 'ERROR');
      }
    });

    socket.on('accusation_verdict', (result) => {
      const verdict = result.revealResult || result;
      setCustomVerdict(verdict);
      setMyTeam(prev => ({ ...prev, hasSubmittedAccusation: true }));
      try {
        generateTribunalAccusationPDF(verdict, myTeam);
      } catch (err) {
        console.warn('PDF auto-generation on socket verdict failed:', err);
      }
      if (result.isSolved) {
        playSuccess();
        showToast('MURDER SOLVED! Elena Ward convicted! Case Record PDF downloaded.', 'SUCCESS');
      } else {
        playError();
        showToast(`Accusation result: ${result.score}/5 correct. Case Record PDF downloaded.`, 'ERROR');
      }
    });

    socket.on('admin_submission_alert', (alertData) => {
      setSubmissionAlerts(prev => {
        const next = [alertData, ...prev];
        try {
          localStorage.setItem('cyber_mafia_submission_alerts', JSON.stringify(next.slice(0, 50)));
        } catch (e) {}
        return next;
      });
      playAlarm();
      showToast(`🚨 TEAM ACCUSATION SUBMITTED: ${alertData.teamName || alertData.teamId} scored ${alertData.score}/5 (${alertData.isSolved ? 'SOLVED' : 'INCORRECT'})`, 'ERROR');
    });

    socket.on('action_error', ({ message }) => {
      playError();
      showToast(message, 'ERROR');
    });

    return () => {
      socket.off('connect');
      socket.off('game_state_update');
      socket.off('joined_team_success');
      socket.off('attack_challenge_ready');
      socket.off('attack_result');
      socket.off('ctf_lab_result');
      socket.off('location_hint_result');
      socket.off('accusation_verdict');
      socket.off('admin_submission_alert');
      socket.off('action_error');
    };
  }, []);

  // Fullscreen trigger helper
  const enterFullscreen = () => {
    initAudio(); // Safely unlock Audio on user gesture
    hasEnteredFullscreenRef.current = true;
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  // Record security alerts & notify admin console
  const recordSecurityAlert = (type, details) => {
    if (isAdmin) return; // Admin is never flagged or locked out
    playAlarm();
    const systemNo = localStorage.getItem('cyber_mafia_system_no') || myTeam?.systemNo || 'SYS-DEFAULT';
    const newAlert = {
      id: 'SEC-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString(),
      playerName: localStorage.getItem('cyber_mafia_player_name') || myTeam?.playerName || 'Investigator',
      systemNo,
      teamId: myTeam?.id || 'C01',
      teamName: myTeam?.name || 'Cyber Alpha',
      type,
      details,
      severity: 'HIGH'
    };

    setSecurityAlerts(prev => {
      const updated = [newAlert, ...prev];
      try {
        localStorage.setItem('cyber_mafia_security_alerts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Also append to chronological audit trail
    setAuditLogs(prev => {
      const updated = [newAlert, ...prev];
      try {
        localStorage.setItem('cyber_mafia_audit_trail', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setGameState(prev => {
      const next = {
        ...prev,
        securityAlerts: [newAlert, ...(prev?.securityAlerts || [])],
        systemLogs: [
          {
            id: 'LOG-SEC-' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            type: 'BREACH',
            source: 'SECURITY_GUARD',
            message: `PROCTORING BREACH: ${newAlert.playerName} (${newAlert.teamId}) [${systemNo}] - ${details}`
          },
          ...(prev?.systemLogs || [])
        ]
      };
      try {
        localStorage.setItem('cyber_mafia_game_state', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (socket && socket.connected) {
      socket.emit('security_alert', newAlert);
    }

    try {
      safeApiFetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SECURITY_ALERT',
          sessionId,
          payload: newAlert
        })
      }, 4000).catch(() => {});
    } catch (e) {}

    showToast(`⚠️ PROCTORING ALERT: ${details}`, 'ERROR');
  };

  // Proctoring & Anti-Cheat Listeners (Fullscreen exit, Tab switch, Window blur, Navigation)
  useEffect(() => {
    if (gameState?.phase !== 'CIVILIAN_PHASE' || isAdmin) return;

    // Check fullscreen state
    const handleFullscreenChange = () => {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFs);
      if (isCurrentlyFs) {
        hasEnteredFullscreenRef.current = true;
      } else if (!isCurrentlyFs && hasEnteredFullscreenRef.current) {
        recordSecurityAlert('FULLSCREEN_EXITED', 'Investigator exited full screen mode.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Tab switch & minimization detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordSecurityAlert('TAB_SWITCH', 'Investigator switched browser tabs or minimized window.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window blur (focus lost to another application)
    const handleWindowBlur = () => {
      recordSecurityAlert('WINDOW_BLUR', 'Game window lost focus (switched to another desktop application or monitor).');
    };

    window.addEventListener('blur', handleWindowBlur);

    // Prevent navigating away or closing window
    const handleBeforeUnload = (e) => {
      recordSecurityAlert('NAVIGATION_ATTEMPT', 'Attempted to navigate away or close test window.');
      e.preventDefault();
      e.returnValue = 'Match is active. Progress will be saved, but leaving is logged as a violation.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameState?.phase, myTeam?.name, isAdmin]);

  // Save gameState and myTeam continuously so reload maintains all progress
  useEffect(() => {
    if (gameState && gameState.phase !== 'LOBBY') {
      try {
        localStorage.setItem('cyber_mafia_game_state', JSON.stringify({
          ...gameState,
          score: myTeam?.score || 0
        }));
      } catch (e) {}
    }
  }, [gameState, myTeam?.score]);

  // Client-side stopwatch tick: tracks elapsed duration upwards
  useEffect(() => {
    if (gameState?.phase === 'CIVILIAN_PHASE' && !gameState.isPaused) {
      const interval = setInterval(() => {
        const savedStart = localStorage.getItem('cyber_mafia_start_time');
        if (savedStart) {
          const diff = Math.max(0, Math.floor((Date.now() - Number(savedStart)) / 1000));
          setElapsedSeconds(diff);
        } else {
          setElapsedSeconds(prev => prev + 1);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.phase, gameState?.isPaused]);

  // Periodic heartbeat to maintain active player status and detect admin kicks
  useEffect(() => {
    if (!myTeam?.id || isAdmin) return;

    const sendHeartbeat = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await safeApiFetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'HEARTBEAT',
            sessionId,
            teamId: myTeam.id,
            playerName: myTeam.playerName || myTeam.name,
            teamName: myTeam.name
          })
        }, 5000);
        if (res && res.ok) {
          const data = await res.json();
          if (data && (data.removed || data.status === 'REMOVED_BY_ADMIN' || data.code === 'REMOVED_BY_ADMIN')) {
            handlePlayerRemovedByAdmin(data.reason || data.message);
          }
        }
      } catch (_) {}
    };

    const interval = setInterval(sendHeartbeat, 12000);
    return () => clearInterval(interval);
  }, [myTeam?.id, myTeam?.name, myTeam?.playerName, isAdmin, sessionId]);

  // Handler: Join Team (Works standalone and syncs over API/socket)
  const handleJoinTeam = async (playerName, teamId, systemNo, teamName) => {
    const finalSystemNo = systemNo || localStorage.getItem('cyber_mafia_system_no') || 'SYS-01';
    const finalTeamName = teamName || localStorage.getItem('cyber_mafia_team_name') || `Squad ${teamId}`;

    localStorage.setItem('cyber_mafia_team_id', teamId);
    localStorage.setItem('cyber_mafia_player_name', playerName);
    localStorage.setItem('cyber_mafia_system_no', finalSystemNo);
    localStorage.setItem('cyber_mafia_team_name', finalTeamName);

    const targetSuspect = gameState?.teams?.find(t => t.id === teamId) || INITIAL_SUSPECTS.find(s => s.id === teamId) || INITIAL_SUSPECTS[0];
    const newTeam = {
      ...targetSuspect,
      id: teamId,
      name: finalTeamName,
      role: 'CIVILIAN',
      playerName,
      systemNo: finalSystemNo,
      score: myTeam?.score || 0,
      integrity: 100,
      visibleEvidence: ALL_EVIDENCE_FILES.filter(e => (gameState?.unlockedEvidenceBatches || [1]).includes(e.batch))
    };
    setMyTeam(newTeam);

    // Record login in chronological audit trail
    const loginAudit = {
      id: 'LOGIN-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'LOGIN',
      playerName,
      systemNo: finalSystemNo,
      teamId,
      teamName: finalTeamName,
      message: `[LOGIN] Investigator ${playerName} logged in on terminal ${finalSystemNo} (Squad: ${finalTeamName} [${teamId}])`
    };

    setAuditLogs(prev => {
      const updated = [loginAudit, ...prev];
      try {
        localStorage.setItem('cyber_mafia_audit_trail', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PLAYER_LOGIN',
          sessionId,
          payload: { playerName, systemNo: finalSystemNo, teamId, teamName: finalTeamName }
        })
      }).catch(() => {});
    } catch (_) {}

    try {
      const res = await safeApiFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JOIN_TEAM',
          sessionId,
          teamId,
          playerName,
          teamName: finalTeamName,
          systemNo: finalSystemNo
        })
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.team) setMyTeam(prev => ({ ...prev, ...data.team, systemNo: finalSystemNo, name: finalTeamName }));
        if (data.state) {
          setGameState(prev => mergeServerStateWithLocal(data.state, prev));
        }
      }
    } catch (e) {
      if (socket && socket.connected) {
        socket.emit('join_lobby', { playerName, teamId, systemNo: finalSystemNo, teamName: finalTeamName, isAdmin });
      }
    }
  };

  // Handler: Start Game (Supports standalone, socket, and authoritative API)
  const handleStartGame = async () => {
    initAudio();
    let startTs = localStorage.getItem('cyber_mafia_start_time');
    if (!startTs) {
      startTs = String(Date.now());
      localStorage.setItem('cyber_mafia_start_time', startTs);
    }
    startTimeRef.current = new Date(Number(startTs));
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Number(startTs)) / 1000)));
    playClick();

    // Enforce Fullscreen mode on start if not admin
    if (!isAdmin) {
      enterFullscreen();
    }

    // In local standalone mode, immediately start investigation
    setGameState(prev => {
      const next = {
        ...prev,
        phase: 'CIVILIAN_PHASE',
        status: 'RUNNING'
      };
      try {
        localStorage.setItem('cyber_mafia_game_state', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (socket && socket.connected) {
      socket.emit('start_game');
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (adminKey) headers['x-admin-key'] = adminKey.trim();
      safeApiFetch('/api/game-action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'START_GAME', sessionId })
      }, 4000).catch(() => {});
    } catch (e) {}

    showToast('Investigation commenced! Stopwatch active. Fullscreen locked.', 'SUCCESS');
  };

  // Handler: Reset Entire Game (Admin Power: erase all saved progress & reset stopwatch)
  const handleResetEntireGame = async () => {
    if (!window.confirm('⚠️ CONFIRM GAME RESET: This will completely wipe all saved player progress, clear all code buffers, erase submitted answers, reset the stopwatch back to 00:00, and return to the lobby.\n\nAre you sure you want to proceed?')) {
      return;
    }

    try {
      localStorage.removeItem('cyber_mafia_game_state');
      localStorage.removeItem('cyber_mafia_code_buffers');
      localStorage.removeItem('cyber_mafia_terminal_outputs');
      localStorage.removeItem('cyber_mafia_submitted_answers');
      localStorage.removeItem('cyber_mafia_start_time');
      localStorage.removeItem('cyber_mafia_security_alerts');
      localStorage.removeItem('cyber_mafia_audit_trail');
    } catch (_) {}

    setElapsedSeconds(0);
    setSecurityAlerts([]);
    setAuditLogs([]);
    const fresh = createInitialGameState();
    setGameState(fresh);
    setShowAdminPanel(false);

    try {
      await fetch('/api/game-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': (adminKey || '').trim()
        },
        body: JSON.stringify({
          action: 'ADMIN_RESET_GAME',
          sessionId
        })
      });
    } catch (_) {}

    if (socket && socket.connected) {
      socket.emit('admin_action', { action: 'RESET_GAME' });
    }

    showToast('Match completely reset. All saved progress erased and stopwatch reset to 00:00.', 'SUCCESS');
  };

  // Handler: Exit to Lobby (Admin can exit or move anytime)
  const handleExitToLobby = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'LOBBY'
    }));
    setShowAdminPanel(false);
    showToast('Returned to main lobby.', 'INFO');
  };

  // Handler: Request Attack Challenge (for Hacker role)
  const handleRequestAttackChallenge = async (targetTeamId, attackType) => {
    if (socket && socket.connected) {
      socket.emit('request_attack_challenge', { targetTeamId, attackType });
    } else {
      try {
        const res = await fetch('/api/game-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'REQUEST_ATTACK_CHALLENGE',
            sessionId,
            teamId: myTeam?.id,
            payload: { targetTeamId, attackType }
          })
        });
        const data = await res.json();
        if (data.challenge) {
          setActiveAttackChallenge(data.challenge);
          showToast(`Challenge ready: ${data.challenge.title}`, 'SUCCESS');
        } else {
          showToast(data.message || 'Cannot launch attack.', 'ERROR');
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Handler: Submit Attack Solution (for Hacker role)
  const handleSubmitAttack = async (challengeId, solution) => {
    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_ATTACK_SOLUTION',
          sessionId,
          teamId: myTeam?.id,
          payload: {
            challenge: activeAttackChallenge,
            solution,
            targetTeamId: activeAttackChallenge?.targetTeamId
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        showToast(data.message, 'SUCCESS');
        setActiveAttackChallenge(null);
        refreshGameState();
      } else {
        playError();
        showToast(data.message, 'ERROR');
      }
    } catch (e) {
      if (socket && socket.connected) {
        socket.emit('submit_attack_solution', { challengeId, solution });
      }
    }
  };

  // Handler: Solve CTF / Python Challenge (Authoritative Backend Validation)
  const handleSolveChallenge = async (challengeId, answer, stageNumber, code = null) => {
    playClick();
    const chal = PYTHON_CHALLENGES.find(c => c.id === challengeId);
    if (!chal) return { success: false, message: 'Challenge not found' };

    const actualCode = code || (typeof stageNumber === 'string' ? stageNumber : null);
    const actualStage = typeof stageNumber === 'number' ? stageNumber : (chal.stageNumber || 1);

    if (socket && socket.connected) {
      socket.emit('solve_civilian_challenge', { challengeId, answer, stageNumber: actualStage, code: actualCode });
    }

    let apiResult = null;
    try {
      const res = await safeApiFetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SOLVE_CIVILIAN_CHALLENGE',
          sessionId,
          teamId: myTeam?.id,
          payload: { 
            challengeId, 
            answer, 
            stageNumber: actualStage, 
            code: actualCode,
            completedStages: gameState?.completedStages || []
          }
        })
      }, 7000);
      if (res) {
        if (typeof res.json === 'function') {
          apiResult = await res.json().catch(() => null);
        } else {
          apiResult = res;
        }
      }
    } catch (e) {
      console.warn('[handleSolveChallenge] API error:', e);
    }

    // Verify if authoritative backend accepted OR if local client verified in offline/fallback mode
    let isAccepted = Boolean(apiResult && (apiResult.success || apiResult.alreadySolved) && apiResult.isVerified !== false);

    // Robust fallback: if API was unreachable or timed out, verify via local sandbox runner
    if (!apiResult && actualCode) {
      try {
        const localCheck = executePythonCode(actualCode, challengeId, chal);
        if (localCheck && localCheck.isVerified && !localCheck.error) {
          isAccepted = true;
          apiResult = {
            success: true,
            isVerified: true,
            cleanOutput: localCheck.result,
            output: localCheck.output,
            message: `Stage ${actualStage} Solved! +${chal.rewardScore || 100} PTS.`
          };
        }
      } catch (_) {}
    }

    // Unlock and advance progress when solution is verified
    if (isAccepted) {
      playSuccess();
      const currentStg = chal.stageNumber || actualStage || 1;
      const nextStage = Math.min(currentStg + 1, 5);
      const nextBatch = Math.min(chal.unlocksEvidenceBatch || (currentStg + 1), 6);
      const points = chal.rewardScore || 100;
      const newScore = (myTeam?.score || 0) + points;
      const verifiedOutput = apiResult?.cleanOutput || answer || 'VERIFIED';

      showToast(`Stage ${currentStg} Solved! +${points} PTS. Evidence Batch ${nextBatch} Unlocked!`, 'SUCCESS');

      setMyTeam(prev => {
        const currentBatches = gameState?.unlockedEvidenceBatches || [1];
        const allBatches = currentBatches.includes(nextBatch) ? currentBatches : [...currentBatches, nextBatch];
        return {
          ...prev,
          score: newScore,
          visibleEvidence: ALL_EVIDENCE_FILES.filter(e => allBatches.includes(e.batch))
        };
      });

      setGameState(prev => {
        const completed = prev?.completedStages || [];
        const newCompleted = completed.includes(currentStg) ? completed : [...completed, currentStg];
        const batches = prev?.unlockedEvidenceBatches || [1];
        const newBatches = batches.includes(nextBatch) ? batches : [...batches, nextBatch];

        const updatedTeams = (prev?.teams || []).map(t => {
          if (t.id === myTeam?.id || t.id === 'C01') {
            return { ...t, score: newScore, completedLevels: newCompleted.length };
          }
          return t;
        });

        const next = {
          ...prev,
          currentStage: Math.max(prev?.currentStage || 1, nextStage),
          completedStages: newCompleted,
          unlockedEvidenceBatches: newBatches,
          teams: updatedTeams,
          score: newScore,
          systemLogs: [
            {
              id: 'LOG-' + Date.now(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'FORENSIC_SOLVE',
              source: `STAGE_${currentStg}`,
              message: `Stage ${currentStg} (${chal.title}) solved! Output "${verifiedOutput}" verified. Unlocked Evidence Batch ${nextBatch}. +${points} PTS.`
            },
            ...(prev?.systemLogs || [])
          ]
        };

        try {
          localStorage.setItem('cyber_mafia_game_state', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      // Append to chronological audit trail
      const solveAudit = {
        id: 'SOLVE-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        category: 'STAGE_SOLVED',
        playerName: myTeam?.playerName || 'Investigator',
        systemNo: myTeam?.systemNo || localStorage.getItem('cyber_mafia_system_no') || 'SYS-DEFAULT',
        teamId: myTeam?.id || 'C01',
        teamName: myTeam?.name || 'Cyber Alpha',
        message: `Stage ${currentStg} (${chal.title}) solved! Verified answer: "${verifiedOutput}". +${points} PTS awarded.`
      };
      setAuditLogs(prev => {
        const updated = [solveAudit, ...prev];
        try {
          localStorage.setItem('cyber_mafia_audit_trail', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      return {
        success: true,
        isVerified: true,
        cleanOutput: verifiedOutput,
        output: apiResult?.output || apiResult?.stdout || `[✔] Verified: Stage ${currentStg} cleared!`,
        message: apiResult?.message || `Stage ${currentStg} Solved! +${points} PTS.`
      };
    } else {
      playError();
      const failMsg = apiResult?.message || apiResult?.feedback || 'Code failed authoritative server validation.';
      showToast(failMsg, 'ERROR');
      return {
        success: false,
        isVerified: false,
        cleanOutput: null,
        output: apiResult?.output || apiResult?.stdout || `> ${failMsg}`,
        error: apiResult?.error || 'Validation failed',
        feedback: failMsg
      };
    }
  };

  // Handler: Request Hint (1 hint per stage, 3 per game)
  const handleRequestHint = (challengeId) => {
    playClick();
    const chal = PYTHON_CHALLENGES.find(c => c.id === challengeId);
    if (!chal) return;

    if (socket && socket.connected) {
      socket.emit('request_location_hint', { locationId: challengeId });
    }

    // Client-side fallback
    if (unlockedHints[challengeId]) {
      showToast('Hint already unlocked for this stage.', 'INFO');
      return;
    }

    if ((gameState?.hintsRemaining ?? 3) <= 0) {
      playError();
      showToast('No investigation hints remaining (3/3 used).', 'ERROR');
      return;
    }

    playSuccess();
    setUnlockedHints(prev => ({ ...prev, [challengeId]: chal.hint }));
    setGameState(prev => ({
      ...prev,
      hintsRemaining: Math.max(0, (prev?.hintsRemaining ?? 3) - 1),
      hintsUsedPerChallenge: { ...(prev?.hintsUsedPerChallenge || {}), [challengeId]: true }
    }));
    showToast(`Hint unlocked (${Math.max(0, (gameState?.hintsRemaining ?? 3) - 1)} remaining)`, 'SUCCESS');
  };

  // Handler: Submit Accusation (Supports both MCQ 5-question model and legacy suspect ID)
  const handleSubmitAccusation = async (answersOrSuspectId, attachedEvidenceIds, notes) => {
    if (myTeam?.hasSubmittedAccusation) {
      playError();
      showToast('❌ SUBMISSION LOCKED: Your team has already submitted an accusation. Only 1 submission allowed.', 'ERROR');
      return;
    }

    playAlarm();

    if (typeof answersOrSuspectId === 'object' && answersOrSuspectId !== null && 'q1' in answersOrSuspectId) {
      const answers = answersOrSuspectId;

      if (socket && socket.connected) {
        socket.emit('submit_mcq_accusation', { answers });
      }

      try {
        const res = await safeApiFetch('/api/game-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SUBMIT_MCQ_ACCUSATION',
            sessionId,
            teamId: myTeam?.id,
            payload: { answers }
          })
        }, 6000);
        if (res && res.ok) {
          const resData = await res.json();
          if (resData.alreadySubmitted) {
            playError();
            showToast('❌ Submission rejected: Team has already submitted an accusation.', 'ERROR');
            setMyTeam(prev => ({ ...prev, hasSubmittedAccusation: true }));
            return;
          }
        }
      } catch (e) {
        // standalone fallback handled below
      }

      // Mark team as submitted locally
      setMyTeam(prev => ({ ...prev, hasSubmittedAccusation: true }));

      // Client-side verdict calculation fallback with Desktop Timestamp receipt
      const isQ1 = answers.q1 === 'D'; // Elena Ward
      const isQ2 = answers.q2 === 'A'; // Poison administered through drink
      const isQ3 = answers.q3 === 'B'; // Prevent exposing unauthorized exports
      const isQ4 = answers.q4 === 'D' || answers.q4 === 'C'; // C (Felix Grant - Bribed to loop CCTV) or D (Elena acted alone)
      const isQ5 = Array.isArray(answers.q5) && ['A', 'B', 'C', 'D'].every(o => answers.q5.includes(o)) && answers.q5.length === 4;

      const score = (isQ1 ? 1 : 0) + (isQ2 ? 1 : 0) + (isQ3 ? 1 : 0) + (isQ4 ? 1 : 0) + (isQ5 ? 1 : 0);
      const isSolved = score === 5;

      const stopTime = new Date();
      const startTime = startTimeRef.current || new Date(Date.now() - 120000);
      const diffSec = Math.max(0, Math.round((stopTime.getTime() - startTime.getTime()) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      const durationStr = `${mins}m ${secs}s (${diffSec} seconds)`;

      const q5Text = Array.isArray(answers.q5) ? answers.q5.sort().join(', ') : (answers.q5 || 'None');

      const report = [
        `======================================================================`,
        `  INIT ASSOCIATION: FALSE TRIALS - HIGH TRIBUNAL RECORD               `,
        `======================================================================`,
        `Investigator / Team : ${myTeam?.name || 'Investigator'} (${myTeam?.id || 'S01'})`,
        `Verdict             : ${isSolved ? 'CASE SOLVED - ELENA WARD GUILTY AS CHARGED' : 'INCORRECT ACCUSATION'}`,
        `Score               : ${score} / 5 Questions Correct`,
        `----------------------------------------------------------------------`,
        `TIMESTAMPS:`,
        `  STARTED AT        : ${startTime.toLocaleString()} [${startTime.toISOString()}]`,
        `  STOPPED AT        : ${stopTime.toLocaleString()} [${stopTime.toISOString()}]`,
        `  TOTAL DURATION    : ${durationStr}`,
        `----------------------------------------------------------------------`,
        `ACCUSATION MCQ SUBMISSIONS:`,
        `  1. Killer         : ${answers.q1 || 'None'} -> Elena Ward (${isQ1 ? 'CORRECT' : 'WRONG'})`,
        `  2. Method/Weapon  : ${answers.q2 || 'None'} -> Poison administered through a drink (${isQ2 ? 'CORRECT' : 'WRONG'})`,
        `  3. Motive         : ${answers.q3 || 'None'} -> Preventing Adrian from exposing unauthorized exports (${isQ3 ? 'CORRECT' : 'WRONG'})`,
        `  4. Accomplice     : ${answers.q4 || 'None'} -> No accomplice established (${isQ4 ? 'CORRECT' : 'WRONG'})`,
        `  5. Evidence       : [${q5Text}] -> TOX-102, MEM-501, WIT-503, BIO-602 (${isQ5 ? 'CORRECT' : 'WRONG'})`,
        `======================================================================`,
        `Generated at: ${new Date().toISOString()}`
      ].join('\n');

      const verdict = {
        success: isSolved,
        isSolved,
        score,
        totalQuestions: 5,
        suspectTeamName: 'Elena Ward',
        suspectTeamId: 'S04',
        actualRole: 'KILLER',
        penaltyMessage: isSolved
          ? `🚨 MURDER SOLVED! Elena Ward convicted of murdering Dr. Adrian Vale! +500 PTS awarded.`
          : `❌ ACCUSATION INCORRECT: ${score}/5 questions correct. Official case record filed with Tribunal.`,
        timestampInfo: {
          startTime: startTime.toISOString(),
          stopTime: stopTime.toISOString(),
          startTimeStr: startTime.toLocaleTimeString(),
          stopTimeStr: stopTime.toLocaleTimeString(),
          durationStr,
          diffSec,
          reportText: report
        }
      };

      setCustomVerdict(verdict);

      // Automatically generate & download the official forensic PDF
      try {
        generateTribunalAccusationPDF(verdict, {
          ...(myTeam || {}),
          hasSubmittedAccusation: true
        });
      } catch (pdfErr) {
        console.error('PDF auto-download error:', pdfErr);
      }

      if (isSolved) {
        playSuccess();
        showToast('MURDER SOLVED! Elena Ward convicted! Case Record PDF downloaded.', 'SUCCESS');
        setMyTeam(prev => ({ ...prev, score: (prev?.score || 0) + 500, hasSubmittedAccusation: true }));
      } else {
        playError();
        showToast(`Accusation result: ${score}/5 correct. Case Record PDF downloaded.`, 'ERROR');
        setMyTeam(prev => ({ ...prev, score: Math.max(0, (prev?.score || 0) - 50), hasSubmittedAccusation: true }));
      }
    } else {
      setMyTeam(prev => ({ ...prev, hasSubmittedAccusation: true }));
      const suspectTeamId = answersOrSuspectId;
      try {
        const res = await safeApiFetch('/api/game-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SUBMIT_ACCUSATION',
            sessionId,
            teamId: myTeam?.id,
            payload: { suspectTeamId, attachedEvidenceIds, notes }
          })
        }, 6000);
        if (res && res.ok) {
          const data = await res.json();
          if (data.success) {
            showToast(data.message, 'SUCCESS');
            refreshGameState();
          }
        }
      } catch (e) {
        if (socket && socket.connected) {
          socket.emit('submit_accusation', { suspectTeamId, attachedEvidenceIds, notes });
        }
      }
    }
  };

  const handleCastVote = async (vote) => {
    try {
      await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CAST_JURY_VOTE',
          sessionId,
          teamId: myTeam?.id,
          payload: { vote }
        })
      });
      showToast(`Vote recorded: ${vote}`, 'SUCCESS');
      refreshGameState();
    } catch (e) {
      if (socket && socket.connected) {
        socket.emit('cast_jury_vote', { vote });
      }
    }
  };

  const handleSendMessage = async (channel, text, evidenceAttachment) => {
    playClick();
    const newMsg = {
      id: 'MSG-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      senderTeamId: myTeam?.id || 'INVESTIGATOR',
      senderTeamName: myTeam?.name || 'Lead Investigator',
      channel,
      text,
      evidenceAttachment
    };

    setGameState(prev => ({
      ...prev,
      chatMessages: [...(prev?.chatMessages || []), newMsg]
    }));

    if (socket && socket.connected) {
      socket.emit('send_chat_message', { channel, text, evidenceAttachment });
    }

    try {
      await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_CHAT',
          sessionId,
          teamId: myTeam?.id,
          payload: { channel, text, evidenceAttachment }
        })
      });
    } catch (e) {
      // offline
    }
  };

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  // Render Lobby if not started
  if (!gameState || gameState.phase === 'LOBBY') {
    return (
      <>
        <LandingLobby
          gameState={gameState}
          onJoinTeam={handleJoinTeam}
          onStartGame={handleStartGame}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleAdminLogout}
          onOpenAdmin={() => {
            playClick();
            setShowAdminPanel(true);
          }}
          isStartingGame={isStartingGame}
        />

        {/* Floating Quick Action Buttons */}
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
          <button
            onClick={() => { playClick(); setShowGuideModal(true); }}
            className="bg-slate-900/90 border border-slate-700 hover:border-cyan-500 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            Quick Guide
          </button>

          {isAdmin && (
            <button
              onClick={() => { playClick(); setShowLeaderboard(true); }}
              className="bg-slate-900/90 border border-amber-600/80 hover:border-amber-400 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
              title="View Live Standings (Admin Only)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Leaderboard (Admin)
            </button>
          )}

          <button
            onClick={() => { playClick(); window.open('/leaderboard', '_blank'); }}
            className="bg-slate-900/90 border border-cyan-800/80 hover:border-cyan-400 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
            title="Open Dedicated Full-Screen Live Leaderboard for Projector"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            Projector View
          </button>
        </div>

        {/* Toast Notification Banner in Lobby */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300 ${
            notification.type === 'SUCCESS' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
            notification.type === 'ERROR' ? 'bg-rose-950/90 border-rose-500 text-rose-200' :
            'bg-slate-900/90 border-cyan-500 text-cyan-200'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}

        {showAdminPanel && (
          <AdminPanel
            isOpen={showAdminPanel}
            onClose={() => setShowAdminPanel(false)}
            gameState={gameState}
            myTeam={myTeam}
            sessionId={sessionId}
            adminKey={adminKey}
            isAdmin={isAdmin}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={handleAdminLogout}
            authError={authError}
            securityAlerts={securityAlerts}
            auditLogs={auditLogs}
            onClearSecurityAlerts={() => {
              setSecurityAlerts([]);
              try {
                localStorage.removeItem('cyber_mafia_security_alerts');
              } catch (e) {}
            }}
            onClearAuditLogs={() => {
              setAuditLogs([]);
              try {
                localStorage.removeItem('cyber_mafia_audit_trail');
              } catch (e) {}
            }}
            onResetEntireGame={handleResetEntireGame}
            onExitToLobby={handleExitToLobby}
            elapsedSeconds={elapsedSeconds}
            submissionAlerts={submissionAlerts}
            onClearSubmissionAlerts={() => {
              setSubmissionAlerts([]);
              try {
                localStorage.removeItem('cyber_mafia_submission_alerts');
              } catch (e) {}
            }}
            onAdminAction={() => {
              if (socket && socket.connected) {
                socket.emit('admin_action', { action: 'REFRESH' });
              }
              refreshGameState();
            }}
          />
        )}

        {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}
        
        {showLeaderboard && isAdmin && (
          <LeaderboardView
            isOpen={showLeaderboard}
            onClose={() => setShowLeaderboard(false)}
            sessionId={sessionId}
            initialLeaderboard={gameState?.leaderboard || []}
            gameState={gameState}
            myTeam={myTeam}
            sessionStatus={gameState?.status || 'LOBBY'}
            isPaused={gameState?.isPaused || false}
            timing={gameState?.timing}
            elapsedSeconds={elapsedSeconds}
            realtimeStatus={realtimeStatus}
          />
        )}
      </>
    );
  }

  const isHacker = myTeam?.role === 'HACKER';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono cyber-grid flex flex-col justify-between p-3 md:p-5 relative">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300 ${
          notification.type === 'SUCCESS' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
          notification.type === 'ERROR' ? 'bg-rose-950/90 border-rose-500 text-rose-200' :
          'bg-slate-900/90 border-cyan-500 text-cyan-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Global PAUSED Indicator */}
      {gameState?.isPaused && (
        <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-200 px-4 py-2.5 rounded-2xl mb-4 text-center font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl animate-pulse">
          <Pause className="w-4 h-4 text-amber-400" />
          MATCH PAUSED BY ADMINISTRATOR — ACTIONS FROZEN. TIMING STOPPED.
        </div>
      )}

      {/* Main Game Top Bar */}
      <header className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 mb-4 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-base md:text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">
              init Association // FALSE TRIALS
            </span>
          </div>
        </div>

        {/* Phase Timer & Compact HUD Indicators */}
        <div className="flex items-center gap-3">
          {/* Investigation Stopwatch */}
          <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner" title="Active investigation stopwatch">
            <Clock className={`w-4 h-4 ${gameState?.isPaused ? 'text-slate-500' : 'text-amber-400 animate-pulse'}`} />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-500 font-bold tracking-wider leading-none">STOPWATCH</span>
              <span className="text-sm font-black text-white font-mono">
                {formatMinutesSeconds(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Active Station Display */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-bold">{myTeam?.name || 'Cyber Alpha'}</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300 font-mono font-bold">{localStorage.getItem('cyber_mafia_system_no') || myTeam?.systemNo || 'SYS-01'}</span>
          </div>

          {/* Stage Progress */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <span className="text-slate-500 font-bold text-[10px]">STAGE:</span>
            <span className="text-cyan-400 font-bold font-mono">{Math.min(gameState?.currentStage || 1, 5)}/5</span>
          </div>

          {/* Score & Integrity */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner">
            <span className="text-emerald-400 font-bold font-mono">+{myTeam?.score || 0} PTS</span>
            <span className="text-slate-600">•</span>
            <span className={`font-bold font-mono ${(myTeam?.integrity || 100) > 60 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {myTeam?.integrity || 100}%
            </span>
          </div>

          {/* Admin Exit to Lobby Button */}
          {isAdmin && (
            <button
              onClick={handleExitToLobby}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500 rounded-xl text-slate-300 hover:text-cyan-300 text-xs font-bold cursor-pointer"
              title="Return to lobby"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lobby</span>
            </button>
          )}

          {/* Leaderboard Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={() => { playClick(); setShowLeaderboard(true); }}
              className="px-3 py-1.5 bg-amber-950/60 border border-amber-600/80 hover:border-amber-400 rounded-xl text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="View Live Standings (Admin Only)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          )}

          {/* Audio & Guide */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSoundToggle}
              className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Toggle Audio"
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
            </button>

            <button
              onClick={() => { playClick(); setShowGuideModal(true); }}
              className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Case Manual"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Command Center */}
      <main className="flex-1 max-w-7xl w-full mx-auto mb-16">
        {isHacker ? (
          <HackerDashboard
            gameState={gameState}
            myTeam={myTeam}
            onRequestChallenge={handleRequestAttackChallenge}
            onSubmitAttack={handleSubmitAttack}
            onUseDeception={(type, payload) => {
              if (socket && socket.connected) {
                socket.emit('use_deception_ability', { abilityType: type, payload });
              }
            }}
            activeAttackChallenge={activeAttackChallenge}
            onCancelChallenge={() => setActiveAttackChallenge(null)}
          />
        ) : (
          <CivilianDashboard
            gameState={gameState}
            myTeam={myTeam}
            elapsedSeconds={elapsedSeconds}
            allEvidence={ALL_EVIDENCE_FILES}
            unlockedBatches={gameState?.unlockedEvidenceBatches || [1]}
            currentStage={gameState?.currentStage || 1}
            completedStages={gameState?.completedStages || []}
            unlockedHints={unlockedHints}
            onSolveChallenge={handleSolveChallenge}
            onRequestHint={handleRequestHint}
            onOpenAccusationModal={() => setShowAccusationModal(true)}
          />
        )}
      </main>

      {/* Accusation Modal */}
      {showAccusationModal && (
        <AccusationModal
          isOpen={showAccusationModal}
          onClose={() => setShowAccusationModal(false)}
          onSubmitAccusation={handleSubmitAccusation}
          hasAlreadySubmitted={Boolean(myTeam?.hasSubmittedAccusation)}
        />
      )}

      {/* Custom Verdict Modal */}
      {customVerdict && (
        <RevealModal
          revealResult={customVerdict}
          onClose={() => setCustomVerdict(null)}
          myTeam={myTeam}
        />
      )}

      {/* Defence Phase Modal */}
      {gameState?.phase === 'DEFENCE_PHASE' && (
        <DefencePhaseModal
          activeAccusation={gameState.activeAccusation}
          defenseStatement={gameState.defenseStatement}
          timer={gameState.timer}
          myTeam={myTeam}
          onSubmitDefense={() => {}}
          onCastVote={handleCastVote}
        />
      )}

      {/* Standard Reveal Modal */}
      {gameState?.phase === 'REVEAL_PHASE' && !customVerdict && (
        <RevealModal
          revealResult={gameState.revealResult}
          timer={gameState.timer}
          myTeam={myTeam}
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          gameState={gameState}
          myTeam={myTeam}
          sessionId={sessionId}
          adminKey={adminKey}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleAdminLogout}
          authError={authError}
          securityAlerts={securityAlerts}
          auditLogs={auditLogs}
          onClearSecurityAlerts={() => {
            setSecurityAlerts([]);
            try {
              localStorage.removeItem('cyber_mafia_security_alerts');
            } catch (e) {}
          }}
          onClearAuditLogs={() => {
            setAuditLogs([]);
            try {
              localStorage.removeItem('cyber_mafia_audit_trail');
            } catch (e) {}
          }}
          onResetEntireGame={handleResetEntireGame}
          onExitToLobby={handleExitToLobby}
          elapsedSeconds={elapsedSeconds}
          submissionAlerts={submissionAlerts}
          onClearSubmissionAlerts={() => {
            setSubmissionAlerts([]);
            try {
              localStorage.removeItem('cyber_mafia_submission_alerts');
            } catch (e) {}
          }}
          onAdminAction={() => {
            if (socket && socket.connected) {
              socket.emit('admin_action', { action: 'REFRESH' });
            }
            refreshGameState();
          }}
        />
      )}

      {/* Leaderboard View - Admin Only */}
      {showLeaderboard && isAdmin && (
        <LeaderboardView
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          sessionId={sessionId}
          initialLeaderboard={gameState?.leaderboard || []}
          gameState={gameState}
          myTeam={myTeam}
          sessionStatus={gameState?.status || 'RUNNING'}
          isPaused={gameState?.isPaused || false}
          timing={gameState?.timing}
          elapsedSeconds={elapsedSeconds}
          realtimeStatus={realtimeStatus}
        />
      )}

      {/* Guide Modal */}
      {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}

      {/* Anti-Cheat Fullscreen Enforcement Modal (Disabled for Admin) */}
      {gameState?.phase === 'CIVILIAN_PHASE' && !isFullscreen && !isAdmin && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-950 border-2 border-rose-500 flex items-center justify-center text-rose-400 mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                init Association // Proctoring Lockdown
              </span>
              <h2 className="text-xl font-black text-white mt-1">FULLSCREEN REQUIRED</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              FALSE TRIALS security enforcement active. You cannot exit fullscreen, switch tabs, or navigate away during investigation.
            </p>
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-[11px] text-rose-300 font-mono">
              ⚠️ Breach event logged to High Tribunal Admin Console.
            </div>
            <button
              onClick={enterFullscreen}
              className="w-full py-3 bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Maximize className="w-4 h-4" />
              Re-Enter Fullscreen Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Case Guide Modal
function GameGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-xs text-slate-300">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-cyan-400 uppercase">CASE FILE // THE MURDER OF DR. ADRIAN VALE</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer">✕</button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-100 mb-1">🔍 Case Overview</h4>
            <p className="text-slate-400">
              Dr. Adrian Vale, Chief AI Security Scientist, was found dead in Research Lab 101.
              Inspect the crime scene locations, decode telemetry buffers, unlock hints, and submit the formal indictment before the high tribunal.
            </p>
          </div>

          <div className="p-3 bg-cyan-950/20 border border-cyan-900/60 rounded-xl space-y-1">
            <h4 className="font-bold text-cyan-300">🏢 Crime Scene Locations & CTF Labs</h4>
            <p className="text-slate-400">
              Visit the Medical Wing, Server Core, Executive Suite, Lab 101, and Security Operations. Each room contains a technical forensic challenge (Hex, Base64, Logic Gates, Pattern, Steganography) that unlocks crucial evidence items.
            </p>
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-900/60 rounded-xl space-y-1">
            <h4 className="font-bold text-amber-300">⚖️ Tribunal Accusation & Timestamp Receipt</h4>
            <p className="text-slate-400">
              When you have gathered sufficient proof, click <strong>ACCUSE</strong>. Answer all 5 multiple-choice questions correctly (Killer, Method, Motive, Accomplice, Evidence) to convict Elena Ward and download your official tribunal record!
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase tracking-wider cursor-pointer text-xs"
        >
          Close Case Manual
        </button>
      </div>
    </div>
  );
}
