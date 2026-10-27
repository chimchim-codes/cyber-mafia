// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Shield, Skull, Volume2, VolumeX, Settings, 
  Clock, AlertTriangle, HelpCircle, X
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

import { toggleSound, playClick, playSuccess, playError, playAlarm } from './utils/soundEffects';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling']
});

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAccusationModal, setShowAccusationModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Hints unlocked per location: { [locationId]: hintText }
  const [unlockedHints, setUnlockedHints] = useState({});

  // Custom Verdict state with timestamp
  const [customVerdict, setCustomVerdict] = useState(null);

  // Active Hacker Challenge in progress
  const [activeAttackChallenge, setActiveAttackChallenge] = useState(null);

  // Status banners / toasts
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'INFO') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to Cyber Forensics server. Socket ID:', socket.id);
    });

    socket.on('game_state_update', (state) => {
      setGameState(state);
      if (state.myTeam) {
        setMyTeam(state.myTeam);
      }
      if (state.phase === 'ROLE_ASSIGNMENT') {
        setShowRoleModal(true);
      }
      if (state.phase === 'DEFENCE_PHASE') {
        playAlarm();
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

    socket.on('deception_result', (result) => {
      if (result.success) {
        playSuccess();
        showToast(result.message, 'SUCCESS');
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

      // Fallback post to record timestamp directly
      if (result.timestampInfo) {
        fetch('/api/record-timestamp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName: myTeam?.name,
            teamId: myTeam?.id,
            answers: result.answers,
            score: result.score,
            isSolved: result.isSolved
          })
        }).catch(() => {});
      }
    });

    socket.on('action_error', ({ message }) => {
      playError();
      showToast(message, 'ERROR');
    });

    return () => {
      socket.off('game_state_update');
      socket.off('joined_team_success');
      socket.off('attack_challenge_ready');
      socket.off('attack_result');
      socket.off('deception_result');
      socket.off('ctf_lab_result');
      socket.off('location_hint_result');
      socket.off('accusation_verdict');
      socket.off('action_error');
    };
  }, [myTeam]);

  const handleJoinTeam = (playerName, teamId) => {
    socket.emit('join_lobby', { playerName, teamId, isAdmin });
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleRequestAttackChallenge = (targetTeamId, attackType) => {
    socket.emit('request_attack_challenge', { targetTeamId, attackType });
  };

  const handleSubmitAttack = (challengeId, solution) => {
    socket.emit('submit_attack_solution', { challengeId, solution });
  };

  const handleUseDeception = (abilityType, payload) => {
    socket.emit('use_deception_ability', { abilityType, payload });
  };

  const handleSolveChallenge = (challengeId, answer) => {
    socket.emit('solve_civilian_challenge', { challengeId, answer });
  };

  const handleRequestHint = (locationId) => {
    socket.emit('request_location_hint', { locationId });
  };

  const handleSubmitAccusation = (answers) => {
    socket.emit('submit_mcq_accusation', { answers });
  };

  const handleSubmitDefense = (statement) => {
    socket.emit('submit_defense_statement', { statement });
  };

  const handleCastVote = (vote) => {
    socket.emit('cast_jury_vote', { vote });
  };

  const handleSendMessage = (channel, text, evidenceAttachment) => {
    socket.emit('send_chat_message', { channel, text, evidenceAttachment });
  };

  const handleAdminAction = (action, payload) => {
    socket.emit('admin_action', { action, payload });
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
          onToggleAdmin={() => setIsAdmin(!isAdmin)}
        />
        <button
          onClick={() => { playClick(); setShowGuideModal(true); }}
          className="fixed bottom-4 left-4 z-50 bg-slate-900/90 border border-slate-700 hover:border-cyan-500 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          Quick Guide
        </button>

        {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}
      </>
    );
  }

  const isHacker = myTeam?.role === 'HACKER';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono cyber-grid flex flex-col justify-between p-3 md:p-5 relative">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-3.5 py-2 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
          notification.type === 'SUCCESS' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
          notification.type === 'ERROR' ? 'bg-rose-950/90 border-rose-500 text-rose-200' :
          'bg-slate-900/90 border-cyan-500 text-cyan-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Game Top Bar (Minimal) */}
      <header className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-4 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-black text-base md:text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">
            CASE: DR. ADRIAN VALE
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            R{gameState.round}/{gameState.maxRounds}
          </span>
        </div>

        {/* Phase Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100 font-mono">
              00:{gameState.timer < 10 ? '0' + gameState.timer : gameState.timer}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleSoundToggle}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
            </button>

            <button
              onClick={() => { playClick(); setShowGuideModal(true); }}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {isAdmin && (
              <button
                onClick={() => { playClick(); setShowAdminPanel(true); }}
                className="p-1.5 bg-amber-950/60 border border-amber-600 rounded-lg text-amber-300 font-bold text-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 animate-spin" />
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
            onUseDeception={handleUseDeception}
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
          onSubmitAccusation={handleSubmitAccusation}
        />
      )}

      {gameState.phase === 'DEFENCE_PHASE' && (
        <DefencePhaseModal
          activeAccusation={gameState.activeAccusation}
          defenseStatement={gameState.defenseStatement}
          timer={gameState.timer}
          myTeam={myTeam}
          onSubmitDefense={handleSubmitDefense}
          onCastVote={handleCastVote}
        />
      )}

      {(gameState.phase === 'REVEAL_PHASE' || customVerdict) && (
        <RevealModal
          revealResult={customVerdict || gameState.revealResult}
          timer={gameState.timer}
          onClose={() => setCustomVerdict(null)}
        />
      )}

      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          gameState={gameState}
          onAdminAction={handleAdminAction}
        />
      )}

      {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}

      {/* Comms Bar */}
      <GameChat
        messages={gameState.chatMessages || []}
        myTeam={myTeam}
        onSendMessage={handleSendMessage}
        visibleEvidence={myTeam?.visibleEvidence || []}
      />
    </div>
  );
}

// Minimal Game Guide Modal
function GameGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-3 text-xs text-slate-300">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase">Case Instructions</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <ul className="space-y-2 text-[11px] text-slate-400 list-disc pl-4">
          <li><strong>Investigate Locations:</strong> Solve CTF labs at each crime scene location to unlock forensic clues.</li>
          <li><strong>Hints:</strong> Only 1 hint allowed per location; maximum 3 hints allowed per whole game.</li>
          <li><strong>Accuse:</strong> Answer the 5-question MCQ indictment. A timestamp of start & stop will be printed on the Desktop upon submission.</li>
        </ul>

        <button
          onClick={onClose}
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase tracking-wider text-xs cursor-pointer mt-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
