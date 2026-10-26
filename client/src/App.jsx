// client/src/App.jsx
// Main Application Component with Supabase Realtime, Persistent Session Reconnection, and Leaderboard

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import { 
  Shield, Skull, Terminal, Volume2, VolumeX, Settings, 
  Clock, Award, Trophy, Radio, AlertTriangle, Play, Pause, HelpCircle 
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

import { toggleSound, playClick, playSuccess, playError, playAlarm } from './utils/soundEffects';

// Setup Supabase Client for Public Realtime Subscriptions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Optional Socket fallback for local Node dev
let socket = null;
try {
  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    autoConnect: true
  });
} catch (e) {
  console.warn('Socket connection not initialized:', e);
}

const DEFAULT_SESSION_ID = 'default-cyber-session';

export default function App() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION_ID);
  const [gameState, setGameState] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem('cyber_mafia_is_admin') === 'true'
  );
  const [soundOn, setSoundOn] = useState(true);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAccusationModal, setShowAccusationModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Accusation prefill state
  const [accusationPrefill, setAccusationPrefill] = useState({
    suspectId: null,
    evidenceIds: []
  });

  // Active Hacker Challenge in progress
  const [activeAttackChallenge, setActiveAttackChallenge] = useState(null);

  // Status banners / toasts
  const [notification, setNotification] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTED');

  const showToast = (message, type = 'INFO') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Authoritative State Fetcher
  const refreshGameState = async (teamId = null) => {
    const activeTeamId = teamId || myTeam?.id || localStorage.getItem('cyber_mafia_team_id');
    try {
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}${activeTeamId ? `&teamId=${activeTeamId}` : ''}`, {
        headers: isAdmin ? { 'x-admin-key': localStorage.getItem('cyber_mafia_admin_key') || '' } : {}
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

  // Initial Load & Reconnection Recovery (Phase 5)
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

  // Supabase Realtime Channel Subscription (Phase 1.3)
  useEffect(() => {
    if (!supabase) return;

    setRealtimeStatus('CONNECTED');
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
        if (status === 'SUBSCRIBED') setRealtimeStatus('CONNECTED');
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setRealtimeStatus('RECONNECTING');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myTeam?.id]);

  // Socket Fallback Events
  useEffect(() => {
    if (!socket) return;

    socket.on('game_state_update', (state) => {
      setGameState(state);
      if (state.myTeam) setMyTeam(state.myTeam);
      if (state.phase === 'ROLE_ASSIGNMENT') setShowRoleModal(true);
      if (state.phase === 'DEFENCE_PHASE') playAlarm();
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

    return () => {
      socket.off('game_state_update');
      socket.off('joined_team_success');
      socket.off('attack_challenge_ready');
      socket.off('attack_result');
    };
  }, []);

  // Action Dispatchers (Rest API + Socket Dual Dispatch)
  const handleJoinTeam = async (playerName, teamId) => {
    localStorage.setItem('cyber_mafia_team_id', teamId);
    localStorage.setItem('cyber_mafia_player_name', playerName);

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
      if (socket) socket.emit('join_lobby', { playerName, teamId, isAdmin });
    }
  };

  const handleStartGame = async () => {
    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START_GAME', sessionId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('CYBER MAFIA match initiated!', 'SUCCESS');
        refreshGameState();
      }
    } catch (e) {
      if (socket) socket.emit('start_game');
    }
  };

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
      if (socket) socket.emit('submit_attack_solution', { challengeId, solution });
    }
  };

  const handleSolveChallenge = async (challengeId, answer) => {
    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SOLVE_CIVILIAN_CHALLENGE',
          sessionId,
          teamId: myTeam?.id,
          payload: { challengeId, answer }
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        showToast(data.message, 'SUCCESS');
        refreshGameState();
      } else {
        playError();
        showToast(data.message, 'ERROR');
      }
    } catch (e) {
      if (socket) socket.emit('solve_civilian_challenge', { challengeId, answer });
    }
  };

  const handleSubmitAccusation = async (suspectTeamId, attachedEvidenceIds, notes) => {
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
        playAlarm();
        showToast(data.message, 'SUCCESS');
        refreshGameState();
      }
    } catch (e) {
      if (socket) socket.emit('submit_accusation', { suspectTeamId, attachedEvidenceIds, notes });
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
      if (socket) socket.emit('cast_jury_vote', { vote });
    }
  };

  const handleSendMessage = async (channel, text, evidenceAttachment) => {
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
      refreshGameState();
    } catch (e) {
      if (socket) socket.emit('send_chat_message', { channel, text, evidenceAttachment });
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
          onToggleAdmin={() => {
            const next = !isAdmin;
            setIsAdmin(next);
            localStorage.setItem('cyber_mafia_is_admin', next ? 'true' : 'false');
          }}
        />

        {/* Floating Quick Action Buttons */}
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
          <button
            onClick={() => { playClick(); setShowGuideModal(true); }}
            className="bg-slate-900/90 border border-slate-700 hover:border-cyan-500 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            Field Manual
          </button>

          <button
            onClick={() => { playClick(); setShowLeaderboard(true); }}
            className="bg-slate-900/90 border border-amber-600/80 hover:border-amber-400 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Leaderboard
          </button>
        </div>

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono cyber-grid flex flex-col justify-between p-3 md:p-6 relative">
      
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

      {/* PHASE 4: Global Clear PAUSED Indicator */}
      {gameState?.isPaused && (
        <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-200 px-4 py-2.5 rounded-2xl mb-4 text-center font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl animate-pulse">
          <Pause className="w-4 h-4 text-amber-400" />
          MATCH PAUSED BY ADMINISTRATOR — ACTIONS FROZEN. TIMING STOPPED.
        </div>
      )}

      {/* Main Game Top Bar */}
      <header className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg md:text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">
              CYBER MAFIA
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
              ROUND {gameState.round}/{gameState.maxRounds}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-500">PHASE:</span>
            <span className="font-bold text-cyan-400 uppercase">{gameState.phase.replace('_', ' ')}</span>
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

          {/* Leaderboard Button (Phase 3) */}
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
              className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Toggle Audio Effects"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={() => { playClick(); setShowGuideModal(true); }}
              className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="View Rules & Guide"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </button>

            {isAdmin && (
              <button
                onClick={() => { playClick(); setShowAdminPanel(true); }}
                className="p-2 bg-amber-950/60 border border-amber-600 rounded-lg text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-4 h-4 animate-spin" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
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
            onUseDeception={() => {}}
            activeAttackChallenge={activeAttackChallenge}
            onCancelChallenge={() => setActiveAttackChallenge(null)}
          />
        ) : (
          <CivilianDashboard
            gameState={gameState}
            myTeam={myTeam}
            onSolveChallenge={handleSolveChallenge}
            onOpenAccusationModal={() => setShowAccusationModal(true)}
            onPrepareAccusation={(data) => {
              setAccusationPrefill({
                suspectId: data.suspectTeamId,
                evidenceIds: data.evidenceIds
              });
              setShowAccusationModal(true);
            }}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      {showRoleModal && (
        <RoleRevealModal
          myTeam={myTeam}
          timer={gameState.timer}
          onAcknowledge={() => setShowRoleModal(false)}
        />
      )}

      {showAccusationModal && (
        <AccusationModal
          isOpen={showAccusationModal}
          onClose={() => setShowAccusationModal(false)}
          allTeams={gameState.teams}
          myTeam={myTeam}
          visibleEvidence={myTeam?.visibleEvidence || []}
          prefilledSuspectId={accusationPrefill.suspectId}
          prefilledEvidenceIds={accusationPrefill.evidenceIds}
          onSubmitAccusation={handleSubmitAccusation}
        />
      )}

      {gameState.phase === 'DEFENCE_PHASE' && (
        <DefencePhaseModal
          activeAccusation={gameState.activeAccusation}
          defenseStatement={gameState.defenseStatement}
          timer={gameState.timer}
          myTeam={myTeam}
          onSubmitDefense={() => {}}
          onCastVote={handleCastVote}
        />
      )}

      {gameState.phase === 'REVEAL_PHASE' && (
        <RevealModal
          revealResult={gameState.revealResult}
          timer={gameState.timer}
        />
      )}

      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          gameState={gameState}
          sessionId={sessionId}
          onAdminAction={() => refreshGameState()}
        />
      )}

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

      {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}

      {/* Social Deduction Tactical Comms Bar */}
      <GameChat
        messages={gameState.chatMessages || []}
        myTeam={myTeam}
        onSendMessage={handleSendMessage}
        visibleEvidence={myTeam?.visibleEvidence || []}
      />
    </div>
  );
}

// Game Guide Modal
function GameGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-xs text-slate-300">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-cyan-400 uppercase">CYBER MAFIA // Tactical Field Manual</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer">✕</button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-bold text-slate-100 mb-1">🎮 Core Concept & Game Loop</h4>
            <p className="text-slate-400">
              Combines Mafia social deduction with real CTF challenges in an authoritative isolated simulation.
              Teams are secretly assigned as <strong>Civilians</strong> or <strong>Hackers</strong>.
            </p>
          </div>

          <div className="p-3 bg-rose-950/20 border border-rose-900/60 rounded-xl space-y-1">
            <h4 className="font-bold text-rose-300">💀 Hackers (Infiltrators)</h4>
            <p className="text-slate-400">
              Select a target squad and launch attacks: <strong>Cookie Shift</strong>, <strong>Token Hunt</strong>, <strong>Route Break</strong>, or <strong>Packet Decode</strong>.
              Solve real challenge payloads to lock target modules. Use <strong>Spoof</strong>, <strong>Erase</strong>, and <strong>Misdirect</strong> to deceive civilian forensic investigators.
            </p>
          </div>

          <div className="p-3 bg-cyan-950/20 border border-cyan-900/60 rounded-xl space-y-1">
            <h4 className="font-bold text-cyan-300">🛡️ Civilians (Defenders & Forensics)</h4>
            <p className="text-slate-400">
              Monitor system integrity, inspect session cookies, analyze server logs, trace packet routes, and solve <strong>CTF Labs</strong> to unlock forensic evidence.
              Pin evidence onto the <strong>Evidence Board</strong> and file formal indictments against suspected hackers!
            </p>
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-900/60 rounded-xl space-y-1">
            <h4 className="font-bold text-amber-300">⚖️ Accusations, 45s Defence & Tribunal Reveal</h4>
            <p className="text-slate-400">
              Filing an indictment triggers a 45-second Defence Phase. The accused can broadcast an alibi, and the jury votes before the server reveals the truth with score awards or false accusation penalties!
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase tracking-wider cursor-pointer text-xs"
        >
          Close Field Manual
        </button>
      </div>
    </div>
  );
}
