// client/src/App.jsx
// Main Application Component with Supabase Realtime, Persistent Session Reconnection, Leaderboard, and Dr. Adrian Vale Murder Investigation
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import { 
  Shield, Skull, Terminal, Volume2, VolumeX, Settings, 
  Clock, Award, Trophy, Radio, AlertTriangle, Play, Pause, HelpCircle, X 
} from 'lucide-react';

import LandingLobby from './components/LandingLobby';
import RoleRevealModal from './components/RoleRevealModal';
import HackerDashboard from './components/HackerDashboard';
import CivilianDashboard from './components/CivilianDashboard';
import AccusationModal from './components/AccusationModal';
import DefencePhaseModal from './components/DefencePhaseModal';
import RevealModal from './components/RevealModal';
import GameChat from './components/GameChat';
import AdminPanel from './components/AdminPanel';
import LeaderboardView from './components/LeaderboardView';

import { 
  INITIAL_SUSPECTS, 
  INVESTIGATION_LOCATIONS, 
  INITIAL_EVIDENCE, 
  createInitialGameState 
} from './data/caseData';

import { toggleSound, playClick, playSuccess, playError, playAlarm } from './utils/soundEffects';

// Setup Supabase Client for Public Realtime Subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Optional Socket fallback for local Node dev
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (typeof window !== 'undefined' ? window.location.origin : '');
let socket = null;
try {
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    timeout: 5000
  });
} catch (e) {
  console.warn('Socket connection not initialized:', e);
}

const DEFAULT_SESSION_ID = 'default-cyber-session';

export default function App() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION_ID);
  const [gameState, setGameState] = useState(() => createInitialGameState());
  const [myTeam, setMyTeam] = useState(() => ({
    ...INITIAL_SUSPECTS[0],
    visibleEvidence: INITIAL_EVIDENCE
  }));
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
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}${activeTeamId ? `&teamId=${activeTeamId}` : ''}`, {
        headers
      });
      if (res.ok) {
        const state = await res.json();
        setGameState(state);
        if (state.myTeam) {
          setMyTeam(state.myTeam);
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
      fetch('/api/session', {
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
          setGameState(data.state);
          if (data.state.myTeam) setMyTeam(data.state.myTeam);
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

  // Socket Fallback Events
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('Connected to Cyber Forensics server. Socket ID:', socket.id);
    });

    socket.on('game_state_update', (state) => {
      if (state) {
        setGameState(state);
        if (state.myTeam) setMyTeam(state.myTeam);
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
      if (result.isSolved) {
        playSuccess();
        showToast('MURDER SOLVED! Elena Ward convicted!', 'SUCCESS');
      } else {
        playError();
        showToast(`Accusation result: ${result.score}/5 correct`, 'ERROR');
      }
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
      socket.off('action_error');
    };
  }, []);

  // Client-side timer tick (works standalone or when server is unavailable)
  useEffect(() => {
    if (gameState?.phase === 'CIVILIAN_PHASE' && gameState.timer > 0 && !gameState.isPaused) {
      const interval = setInterval(() => {
        setGameState(prev => {
          if (!prev) return prev;
          if (prev.timer <= 1) {
            return { ...prev, timer: 0 };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState?.phase, gameState?.timer, gameState?.isPaused]);

  // Handler: Join Team (Works standalone and syncs over API/socket)
  const handleJoinTeam = async (playerName, teamId) => {
    localStorage.setItem('cyber_mafia_team_id', teamId);
    localStorage.setItem('cyber_mafia_player_name', playerName);

    const targetSuspect = gameState?.teams?.find(t => t.id === teamId) || INITIAL_SUSPECTS.find(s => s.id === teamId) || INITIAL_SUSPECTS[0];
    setMyTeam({
      ...targetSuspect,
      name: playerName ? `${targetSuspect.name} [${playerName}]` : targetSuspect.name,
      playerName: playerName || targetSuspect.name,
      visibleEvidence: INITIAL_EVIDENCE
    });

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JOIN_TEAM',
          sessionId,
          teamId,
          playerName
        })
      });
      const data = await res.json();
      if (data.team) setMyTeam(data.team);
      if (data.state) setGameState(data.state);
    } catch (e) {
      if (socket && socket.connected) {
        socket.emit('join_lobby', { playerName, teamId, isAdmin });
      }
    }
  };

  // Handler: Start Game (Supports standalone, socket, and authoritative API)
  const handleStartGame = async () => {
    startTimeRef.current = new Date();
    playClick();

    // In local standalone mode, immediately start investigation
    setGameState(prev => ({
      ...prev,
      phase: 'CIVILIAN_PHASE',
      status: 'RUNNING',
      timer: prev?.timer > 0 ? prev.timer : 180
    }));

    if (socket && socket.connected) {
      socket.emit('start_game');
    }

    const keyToUse = adminKey.trim() || localStorage.getItem('cyber_mafia_admin_key') || '';
    if (keyToUse) {
      setIsStartingGame(true);
      try {
        const res = await fetch('/api/game-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': keyToUse
          },
          body: JSON.stringify({ action: 'START_GAME', sessionId })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          playSuccess();
          showToast('Investigation commenced!', 'SUCCESS');
          await refreshGameState();
        }
      } catch (e) {
        console.warn('API start_game fallback used local state:', e);
      } finally {
        setIsStartingGame(false);
      }
    }
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

  // Handler: Solve CTF Challenge
  const handleSolveChallenge = async (challengeId, answer) => {
    playClick();
    const chal = gameState?.civilianLabChallenges?.find(c => c.id === challengeId);

    if (socket && socket.connected) {
      socket.emit('solve_civilian_challenge', { challengeId, answer });
    }

    try {
      await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SOLVE_CIVILIAN_CHALLENGE',
          sessionId,
          teamId: myTeam?.id,
          payload: { challengeId, answer }
        })
      });
    } catch (e) {
      // offline fallback handled below
    }

    // Client-side validation fallback
    if (chal) {
      const isCorrect = (answer || '').trim().toLowerCase() === (chal.expected || '').trim().toLowerCase();

      if (isCorrect) {
        playSuccess();
        showToast(`Challenge Solved! +${chal.rewardScore || 100} PTS`, 'SUCCESS');
        setGameState(prev => ({
          ...prev,
          civilianLabChallenges: prev.civilianLabChallenges?.map(c => 
            c.id === challengeId ? { ...c, isSolved: true } : c
          ),
          systemLogs: [
            {
              id: 'LOG-' + Date.now(),
              timestamp: new Date().toLocaleTimeString(),
              type: 'FORENSIC_SOLVE',
              source: chal.locationName || 'LAB',
              message: `Forensic puzzle solved! Unlocked clue: "${chal.evidenceClue}"`
            },
            ...(prev.systemLogs || [])
          ]
        }));

        setMyTeam(prev => ({
          ...prev,
          score: (prev?.score || 0) + (chal.rewardScore || 100)
        }));
      } else {
        playError();
        showToast('Incorrect solution. Inspect the evidence and try again.', 'ERROR');
      }
    }
  };

  // Handler: Request Hint (1 hint per location, 3 per game)
  const handleRequestHint = (locationId) => {
    playClick();
    const loc = INVESTIGATION_LOCATIONS.find(l => l.id === locationId);
    if (!loc) return;

    if (socket && socket.connected) {
      socket.emit('request_location_hint', { locationId });
    }

    // Client-side fallback
    if (unlockedHints[locationId]) {
      showToast('Hint already unlocked for this location.', 'INFO');
      return;
    }

    if ((gameState?.hintsRemaining ?? 3) <= 0) {
      playError();
      showToast('No investigation hints remaining (3/3 used).', 'ERROR');
      return;
    }

    playSuccess();
    setUnlockedHints(prev => ({ ...prev, [locationId]: loc.hint }));
    setGameState(prev => ({
      ...prev,
      hintsRemaining: Math.max(0, (prev?.hintsRemaining ?? 3) - 1),
      hintsUsedPerLocation: { ...(prev?.hintsUsedPerLocation || {}), [locationId]: true }
    }));
    showToast(`Hint unlocked (${Math.max(0, (gameState?.hintsRemaining ?? 3) - 1)} remaining)`, 'SUCCESS');
  };

  // Handler: Submit Accusation (Supports both MCQ 5-question model and legacy suspect ID)
  const handleSubmitAccusation = async (answersOrSuspectId, attachedEvidenceIds, notes) => {
    playAlarm();

    if (typeof answersOrSuspectId === 'object' && answersOrSuspectId !== null && 'q1' in answersOrSuspectId) {
      const answers = answersOrSuspectId;

      if (socket && socket.connected) {
        socket.emit('submit_mcq_accusation', { answers });
      }

      try {
        await fetch('/api/game-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SUBMIT_MCQ_ACCUSATION',
            sessionId,
            teamId: myTeam?.id,
            payload: { answers }
          })
        });
      } catch (e) {
        // standalone fallback handled below
      }

      // Client-side verdict calculation fallback with Desktop Timestamp receipt
      const isQ1 = answers.q1 === 'D'; // Elena Ward
      const isQ2 = answers.q2 === 'A'; // Poison administered through drink
      const isQ3 = answers.q3 === 'B'; // Prevent exposing unauthorized exports
      const isQ4 = answers.q4 === 'D'; // No accomplice
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
        `  INTERNAL TECH FEST: DR. ADRIAN VALE MURDER CASE - TRIBUNAL RECORD   `,
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
        `  5. Evidence       : [${q5Text}] -> MED-11, DATA-09, GM-20, GM-21 (${isQ5 ? 'CORRECT' : 'WRONG'})`,
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
          : `❌ ACCUSATION INCORRECT: ${score}/5 questions correct. Review forensic evidence and try again.`,
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

      if (isSolved) {
        playSuccess();
        showToast('MURDER SOLVED! Elena Ward convicted!', 'SUCCESS');
        setMyTeam(prev => ({ ...prev, score: (prev?.score || 0) + 500 }));
      } else {
        playError();
        showToast(`Accusation result: ${score}/5 correct`, 'ERROR');
        setMyTeam(prev => ({ ...prev, score: Math.max(0, (prev?.score || 0) - 50) }));
      }
    } else {
      const suspectTeamId = answersOrSuspectId;
      try {
        const res = await fetch('/api/game-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SUBMIT_ACCUSATION',
            sessionId,
            teamId: myTeam?.id,
            payload: { suspectTeamId, attachedEvidenceIds, notes }
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'SUCCESS');
          refreshGameState();
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
  if (!gameState || gameState.phase === 'LOBBY' || gameState.status === 'NOT_STARTED') {
    return (
      <>
        <LandingLobby
          gameState={gameState}
          onJoinTeam={handleJoinTeam}
          onStartGame={handleStartGame}
          isAdmin={isAdmin}
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

          <button
            onClick={() => { playClick(); setShowLeaderboard(true); }}
            className="bg-slate-900/90 border border-amber-600/80 hover:border-amber-400 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Leaderboard
          </button>

          <button
            onClick={() => { playClick(); setShowAdminPanel(true); }}
            className={`border px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg transition-colors ${
              isAdmin
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 hover:bg-amber-900/90'
                : 'bg-slate-900/90 border-slate-700 hover:border-amber-500 text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            {isAdmin ? 'Admin Console' : 'Admin Login'}
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
            sessionId={sessionId}
            adminKey={adminKey}
            isAdmin={isAdmin}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={handleAdminLogout}
            authError={authError}
            onAdminAction={() => {
              if (socket && socket.connected) {
                socket.emit('admin_action', { action: 'REFRESH' });
              }
              refreshGameState();
            }}
          />
        )}

        {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}
        
        {showLeaderboard && (
          <LeaderboardView
            isOpen={showLeaderboard}
            onClose={() => setShowLeaderboard(false)}
            sessionId={sessionId}
            initialLeaderboard={gameState?.leaderboard || []}
            sessionStatus={gameState?.status || 'LOBBY'}
            isPaused={gameState?.isPaused || false}
            timing={gameState?.timing}
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
              CYBER FORENSICS // DR. ADRIAN VALE CASE
            </span>
          </div>
        </div>

        {/* Phase Timer & Leaderboard Gauge */}
        <div className="flex items-center gap-3">
          {/* Active Gameplay Elapsed Time */}
          {gameState?.timing && (
            <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 text-[10px]">ACTIVE:</span>
              <span className="font-bold text-cyan-300">
                {Math.floor(gameState.timing.activeGameplaySeconds / 60)}:
                {(gameState.timing.activeGameplaySeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Phase Countdown Gauge */}
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800">
            <Clock className={`w-4 h-4 ${gameState.isPaused ? 'text-slate-500' : 'text-amber-400 animate-pulse'}`} />
            <span className="text-sm font-bold text-slate-100 font-mono">
              00:{gameState.timer < 10 ? '0' + gameState.timer : gameState.timer}
            </span>
          </div>

          {/* Leaderboard Button */}
          <button
            onClick={() => { playClick(); setShowLeaderboard(true); }}
            className="px-3 py-1.5 bg-amber-950/60 border border-amber-600/80 hover:border-amber-400 rounded-xl text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="View Live Standings"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>

          {/* Audio, Guide & Admin */}
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

            <button
              onClick={() => { playClick(); setShowAdminPanel(true); }}
              className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer border ${
                isAdmin
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Administrative Master Console"
            >
              <Settings className={`w-4 h-4 ${isAdmin ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline">{isAdmin ? 'Admin' : 'Admin Login'}</span>
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
        />
      )}

      {/* Custom Verdict Modal */}
      {customVerdict && (
        <RevealModal
          revealResult={customVerdict}
          onClose={() => setCustomVerdict(null)}
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
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          gameState={gameState}
          sessionId={sessionId}
          adminKey={adminKey}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleAdminLogout}
          authError={authError}
          onAdminAction={() => {
            if (socket && socket.connected) {
              socket.emit('admin_action', { action: 'REFRESH' });
            }
            refreshGameState();
          }}
        />
      )}

      {/* Leaderboard View */}
      {showLeaderboard && (
        <LeaderboardView
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          sessionId={sessionId}
          initialLeaderboard={gameState?.leaderboard || []}
          sessionStatus={gameState?.status || 'RUNNING'}
          isPaused={gameState?.isPaused || false}
          timing={gameState?.timing}
          realtimeStatus={realtimeStatus}
        />
      )}

      {/* Guide Modal */}
      {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}

      {/* Tactical Comms */}
      <GameChat
        messages={gameState?.chatMessages || []}
        myTeam={myTeam}
        onSendMessage={handleSendMessage}
        visibleEvidence={myTeam?.visibleEvidence || []}
      />
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
