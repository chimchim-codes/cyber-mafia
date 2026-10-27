// client/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Shield, Volume2, VolumeX, Settings, 
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

import { 
  INITIAL_SUSPECTS, 
  INVESTIGATION_LOCATIONS, 
  INITIAL_EVIDENCE, 
  createInitialGameState 
} from './data/caseData';

import { toggleSound, playClick, playSuccess, playError, playAlarm } from './utils/soundEffects';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  timeout: 5000
});

export default function App() {
  const [gameState, setGameState] = useState(() => createInitialGameState());
  const [myTeam, setMyTeam] = useState(() => ({
    ...INITIAL_SUSPECTS[0],
    visibleEvidence: INITIAL_EVIDENCE
  }));
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

  // Start time tracker for standalone timestamps
  const startTimeRef = useRef(new Date());

  const showToast = (message, type = 'INFO') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Socket.io sync (if connected to a live backend)
  useEffect(() => {
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
    if (gameState.phase === 'CIVILIAN_PHASE' && gameState.timer > 0 && !gameState.isPaused) {
      const interval = setInterval(() => {
        setGameState(prev => {
          if (prev.timer <= 1) {
            return { ...prev, timer: 0 };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.phase, gameState.timer, gameState.isPaused]);

  // Handler: Join Team (Works standalone and syncs over socket)
  const handleJoinTeam = (playerName, teamId) => {
    const targetSuspect = gameState.teams.find(t => t.id === teamId) || gameState.teams[0];
    setMyTeam({
      ...targetSuspect,
      name: playerName ? `${targetSuspect.name} [${playerName}]` : targetSuspect.name,
      playerName: playerName || targetSuspect.name,
      visibleEvidence: INITIAL_EVIDENCE
    });

    if (socket.connected) {
      socket.emit('join_lobby', { playerName, teamId, isAdmin });
    }
  };

  // Handler: Start Game (Works standalone and syncs over socket)
  const handleStartGame = () => {
    startTimeRef.current = new Date();
    playClick();
    setGameState(prev => ({
      ...prev,
      phase: 'CIVILIAN_PHASE',
      timer: 180
    }));

    if (socket.connected) {
      socket.emit('start_game');
    }
  };

  // Handler: Solve CTF Challenge
  const handleSolveChallenge = (challengeId, answer) => {
    playClick();
    const chal = gameState.civilianLabChallenges?.find(c => c.id === challengeId);
    if (!chal) return;

    if (socket.connected) {
      socket.emit('solve_civilian_challenge', { challengeId, answer });
    }

    // Client-side validation fallback
    const isCorrect = (answer || '').trim().toLowerCase() === (chal.expected || '').trim().toLowerCase();

    if (isCorrect) {
      playSuccess();
      showToast(`Challenge Solved! +${chal.rewardScore || 100} PTS`, 'SUCCESS');
      setGameState(prev => ({
        ...prev,
        civilianLabChallenges: prev.civilianLabChallenges.map(c => 
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
          ...prev.systemLogs
        ]
      }));

      setMyTeam(prev => ({
        ...prev,
        score: (prev.score || 0) + (chal.rewardScore || 100)
      }));
    } else {
      playError();
      showToast('Incorrect solution. Inspect the evidence and try again.', 'ERROR');
    }
  };

  // Handler: Request Hint
  const handleRequestHint = (locationId) => {
    playClick();
    const loc = INVESTIGATION_LOCATIONS.find(l => l.id === locationId);
    if (!loc) return;

    if (socket.connected) {
      socket.emit('request_location_hint', { locationId });
    }

    // Client-side fallback
    if (unlockedHints[locationId]) {
      showToast('Hint already unlocked for this location.', 'INFO');
      return;
    }

    if (gameState.hintsRemaining <= 0) {
      playError();
      showToast('No investigation hints remaining (3/3 used).', 'ERROR');
      return;
    }

    playSuccess();
    setUnlockedHints(prev => ({ ...prev, [locationId]: loc.hint }));
    setGameState(prev => ({
      ...prev,
      hintsRemaining: Math.max(0, prev.hintsRemaining - 1),
      hintsUsedPerLocation: { ...prev.hintsUsedPerLocation, [locationId]: true }
    }));
    showToast(`Hint unlocked (${Math.max(0, gameState.hintsRemaining - 1)} remaining)`, 'SUCCESS');
  };

  // Handler: Submit Accusation
  const handleSubmitAccusation = (answers) => {
    playAlarm();

    if (socket.connected) {
      socket.emit('submit_mcq_accusation', { answers });
    }

    // Client-side verdict calculation fallback
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
      setMyTeam(prev => ({ ...prev, score: (prev.score || 0) + 500 }));
    } else {
      playError();
      showToast(`Accusation result: ${score}/5 correct`, 'ERROR');
      setMyTeam(prev => ({ ...prev, score: Math.max(0, (prev.score || 0) - 50) }));
    }
  };

  const handleSendMessage = (channel, text, evidenceAttachment) => {
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
      chatMessages: [...(prev.chatMessages || []), newMsg]
    }));

    if (socket.connected) {
      socket.emit('send_chat_message', { channel, text, evidenceAttachment });
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
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300 ${
          notification.type === 'SUCCESS' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
          notification.type === 'ERROR' ? 'bg-rose-950/90 border-rose-500 text-rose-200' :
          'bg-slate-900/90 border-cyan-500 text-cyan-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{notification.message}</span>
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

        {/* Phase Timer Gauge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100 font-mono">
              00:{gameState.timer < 10 ? '0' + gameState.timer : gameState.timer}
            </span>
          </div>

          {/* Sound & Guide Buttons */}
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

            {isAdmin && (
              <button
                onClick={() => { playClick(); setShowAdminPanel(true); }}
                className="p-1.5 bg-amber-950/60 border border-amber-600 rounded-lg text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Interactive Command Center */}
      <main className="flex-1 max-w-7xl w-full mx-auto mb-14">
        {isHacker ? (
          <HackerDashboard
            gameState={gameState}
            myTeam={myTeam}
            onRequestChallenge={(targetId, type) => {
              if (socket.connected) {
                socket.emit('request_attack_challenge', { targetTeamId: targetId, attackType: type });
              }
            }}
            onSubmitAttack={(chalId, sol) => {
              if (socket.connected) {
                socket.emit('submit_attack_solution', { challengeId: chalId, solution: sol });
              }
            }}
            onUseDeception={(type, payload) => {
              if (socket.connected) {
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

      {/* Standard Reveal Modal */}
      {gameState.phase === 'REVEAL_PHASE' && !customVerdict && (
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
          onAdminAction={(action, payload) => {
            if (socket.connected) {
              socket.emit('admin_action', { action, payload });
            }
          }}
        />
      )}

      {/* Guide Modal */}
      {showGuideModal && <GameGuideModal onClose={() => setShowGuideModal(false)} />}

      {/* Tactical Comms */}
      <GameChat
        messages={gameState.chatMessages || []}
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
