// client/src/components/AdminPanel.jsx
// Upgraded God-Mode Admin Console with Session Lifecycle, Recovery Snapshots, Resets & CSV Export

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Eye, Play, Pause, RefreshCw, Zap, 
  Bot, Settings, Skull, Shield, X, AlertTriangle, Download, 
  History, RotateCcw, CheckCircle2, FileSpreadsheet, Lock
} from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

export default function AdminPanel({
  isOpen,
  onClose,
  gameState,
  onAdminAction,
  sessionId = 'default-cyber-session'
}) {
  const [adminKey, setAdminKey] = useState(
    localStorage.getItem('cyber_mafia_admin_key') || 'cyber-mafia-admin-secret-replace-in-production'
  );
  const [injectTargetId, setInjectTargetId] = useState('C02');
  const [selectedRecoveryTeam, setSelectedRecoveryTeam] = useState('C01');
  const [selectedRecoveryLevel, setSelectedRecoveryLevel] = useState(1);
  const [snapshotHistory, setSnapshotHistory] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [snapshotActionMessage, setSnapshotActionMessage] = useState(null);

  // Restore Modal State
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [restoreReason, setRestoreReason] = useState('Authorized administrative rollback to validated checkpoint.');
  const [isRestoring, setIsRestoring] = useState(false);

  // Reset confirmation state
  const [resetReason, setResetReason] = useState('Administrative progress reset.');
  const [isResetting, setIsResetting] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState('LIFECYCLE'); // LIFECYCLE, RECOVERY, TEAMS, INJECT

  const saveAdminKey = (key) => {
    setAdminKey(key);
    localStorage.setItem('cyber_mafia_admin_key', key);
  };

  const fetchSnapshots = async (teamId, levelId) => {
    setLoadingSnapshots(true);
    setSnapshotActionMessage(null);
    try {
      const res = await fetch(`/api/admin/recovery?sessionId=${encodeURIComponent(sessionId)}&teamId=${teamId}&levelId=${levelId}`, {
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSnapshotHistory(data.snapshots || []);
    } catch (err) {
      setSnapshotActionMessage({ type: 'ERROR', text: 'Failed to load recovery snapshots: ' + err.message });
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'RECOVERY') {
      fetchSnapshots(selectedRecoveryTeam, selectedRecoveryLevel);
    }
  }, [isOpen, activeTab, selectedRecoveryTeam, selectedRecoveryLevel]);

  if (!isOpen) return null;

  // Lifecycle Action Handlers (Phase 4)
  const handleLifecycle = async (actionType) => {
    playClick();
    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          action: actionType,
          sessionId,
          payload: { reason: 'Admin panel triggered ' + actionType }
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSnapshotActionMessage({ type: 'SUCCESS', text: data.message || `${actionType} executed successfully.` });
        if (onAdminAction) onAdminAction('REFRESH');
      } else {
        playError();
        setSnapshotActionMessage({ type: 'ERROR', text: data.message || `Failed to execute ${actionType}.` });
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    }
  };

  // Restore Snapshot Handler (Phase 6.3)
  const handleExecuteRestore = async () => {
    if (!selectedSnapshot) return;
    if (!restoreReason.trim()) {
      alert('An explicit administrative reason is required to restore a checkpoint.');
      return;
    }
    setIsRestoring(true);
    playClick();
    try {
      const res = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          action: 'RESTORE_SNAPSHOT',
          sessionId,
          snapshotId: selectedSnapshot.id,
          reason: restoreReason,
          adminIdentity: 'CONSOLE_ADMIN'
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSnapshotActionMessage({
          type: 'SUCCESS',
          text: `Snapshot ${selectedSnapshot.id} restored! Team score adjusted by ${data.scoreAdjustment > 0 ? '+' : ''}${data.scoreAdjustment} PTS.`
        });
        setSelectedSnapshot(null);
        fetchSnapshots(selectedRecoveryTeam, selectedRecoveryLevel);
        if (onAdminAction) onAdminAction('REFRESH');
      } else {
        playError();
        setSnapshotActionMessage({ type: 'ERROR', text: data.message || 'Restoration failed.' });
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    } finally {
      setIsRestoring(false);
    }
  };

  // Reset Operations Handlers (Phase 6.4)
  const handleResetLevel = async () => {
    if (!confirm(`Are you sure you want to reset Level ${selectedRecoveryLevel} for Team ${selectedRecoveryTeam}?`)) return;
    setIsResetting(true);
    playClick();
    try {
      const res = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          action: 'RESET_LEVEL',
          sessionId,
          teamId: selectedRecoveryTeam,
          levelId: selectedRecoveryLevel,
          reason: resetReason,
          adminIdentity: 'CONSOLE_ADMIN'
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSnapshotActionMessage({ type: 'SUCCESS', text: `Level ${selectedRecoveryLevel} reset for Team ${selectedRecoveryTeam}.` });
        fetchSnapshots(selectedRecoveryTeam, selectedRecoveryLevel);
        if (onAdminAction) onAdminAction('REFRESH');
      } else {
        playError();
        setSnapshotActionMessage({ type: 'ERROR', text: data.message });
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetTeamEntire = async () => {
    if (!confirm(`CAUTION: Reset entire progress and zero score for Team ${selectedRecoveryTeam}?`)) return;
    setIsResetting(true);
    playClick();
    try {
      const res = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          action: 'RESET_TEAM_ENTIRE',
          sessionId,
          teamId: selectedRecoveryTeam,
          reason: resetReason,
          adminIdentity: 'CONSOLE_ADMIN'
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSnapshotActionMessage({ type: 'SUCCESS', text: `Team ${selectedRecoveryTeam} entirely reset to 0 PTS.` });
        fetchSnapshots(selectedRecoveryTeam, selectedRecoveryLevel);
        if (onAdminAction) onAdminAction('REFRESH');
      } else {
        playError();
        setSnapshotActionMessage({ type: 'ERROR', text: data.message });
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRecalculateScore = async () => {
    playClick();
    try {
      const res = await fetch('/api/admin/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          action: 'RECALCULATE_SCORE',
          sessionId,
          teamId: selectedRecoveryTeam,
          reason: 'Admin audited and recalculated score from ledger.',
          adminIdentity: 'CONSOLE_ADMIN'
        })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSnapshotActionMessage({ type: 'SUCCESS', text: `Recalculated score from audit ledger: ${data.recalculatedScore} PTS.` });
        if (onAdminAction) onAdminAction('REFRESH');
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    }
  };

  // CSV Export Handler (Phase 7)
  const handleExportCsv = () => {
    playClick();
    const url = `/api/admin/export-csv?sessionId=${encodeURIComponent(sessionId)}&adminKey=${encodeURIComponent(adminKey)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl space-y-4 font-mono relative max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                Authoritative Master Control (Vercel + Supabase)
              </span>
              <h3 className="text-xl font-black text-white">GOD-MODE ADMIN CONSOLE</h3>
            </div>
          </div>

          {/* Export CSV Button (Phase 7) */}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 hover:to-green-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
            title="Download authoritative leaderboard as CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Final CSV
          </button>
        </div>

        {/* Admin Secret Key Config Bar */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Admin Secret Key:</span>
          </div>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => saveAdminKey(e.target.value)}
            placeholder="Enter ADMIN_SECRET_KEY"
            className="flex-1 max-w-sm bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-amber-300 font-mono"
          />
        </div>

        {/* Feedback Alert Banner */}
        {snapshotActionMessage && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            snapshotActionMessage.type === 'SUCCESS' ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200' :
            'bg-rose-950/70 border-rose-600 text-rose-200'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{snapshotActionMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs">
          {[
            { id: 'LIFECYCLE', label: 'Match Lifecycle (Start/Pause/End)' },
            { id: 'RECOVERY', label: 'Recovery Snapshots & Resets' },
            { id: 'TEAMS', label: 'Squad Telemetry & Roles' },
            { id: 'INJECT', label: 'Breach Simulation' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { playClick(); setActiveTab(tab.id); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === tab.id ? 'bg-amber-950/60 border border-amber-500 text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: LIFECYCLE (Phase 4) */}
        {activeTab === 'LIFECYCLE' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase flex items-center justify-between">
                <span>Session Lifecycle State:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  gameState?.isPaused ? 'bg-amber-950 text-amber-400 border border-amber-700 animate-pulse' :
                  gameState?.status === 'COMPLETED' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {gameState?.isPaused ? 'MATCH PAUSED' : gameState?.status || 'RUNNING'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleLifecycle('START_GAME')}
                  disabled={gameState?.status === 'RUNNING' || gameState?.status === 'PAUSED'}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-xl text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-emerald-400" /> Start Game
                </button>

                <button
                  onClick={() => handleLifecycle(gameState?.isPaused ? 'RESUME_GAME' : 'PAUSE_GAME')}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-amber-500 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {gameState?.isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                  {gameState?.isPaused ? 'Resume Match' : 'Pause Match'}
                </button>

                <button
                  onClick={() => handleLifecycle('END_GAME')}
                  disabled={gameState?.status === 'COMPLETED'}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-rose-500 rounded-xl text-xs text-rose-400 font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Skull className="w-4 h-4" /> End Match
                </button>

                <button
                  onClick={() => {
                    playClick();
                    onAdminAction('REVEAL_ALL');
                  }}
                  className="p-3 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-xl text-xs text-cyan-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Reveal Roles
                </button>
              </div>
            </div>

            {/* Phase Force Overrides */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase">Emergency Phase Overrides:</div>
              <div className="flex flex-wrap gap-2">
                {['HACKER_PHASE', 'CIVILIAN_PHASE', 'DEFENCE_PHASE', 'REVEAL_PHASE', 'GAME_OVER'].map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      playClick();
                      onAdminAction('FORCE_PHASE', { phase: p });
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      gameState?.phase === p
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECOVERY SNAPSHOTS & RESETS (Phase 6) */}
        {activeTab === 'RECOVERY' && (
          <div className="space-y-4">
            {/* Filter and Squad Selector */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Target Squad:</span>
                <select
                  value={selectedRecoveryTeam}
                  onChange={(e) => setSelectedRecoveryTeam(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                >
                  {gameState?.teams?.map(t => (
                    <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                  ))}
                </select>

                <span className="text-slate-400">Level/Round:</span>
                <select
                  value={selectedRecoveryLevel}
                  onChange={(e) => setSelectedRecoveryLevel(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                >
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <option key={lvl} value={lvl}>Level {lvl}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecalculateScore}
                  className="px-3 py-1.5 bg-slate-900 border border-cyan-800 hover:border-cyan-500 text-cyan-300 rounded-lg text-xs font-bold cursor-pointer"
                  title="Recalculate score from authoritative score_events ledger"
                >
                  Recalculate Score
                </button>
                <button
                  onClick={handleResetLevel}
                  disabled={isResetting}
                  className="px-3 py-1.5 bg-rose-950/40 border border-rose-800 hover:border-rose-500 text-rose-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Reset Level {selectedRecoveryLevel}
                </button>
                <button
                  onClick={handleResetTeamEntire}
                  disabled={isResetting}
                  className="px-3 py-1.5 bg-rose-950 border border-rose-600 hover:border-rose-500 text-rose-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Reset Entire Squad
                </button>
              </div>
            </div>

            {/* Snapshot History Table */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase">
                <span className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-400" />
                  Checkpoint History for {selectedRecoveryTeam} (Level {selectedRecoveryLevel}):
                </span>
                <span className="text-slate-500">{snapshotHistory.length} Recorded Snapshots</span>
              </div>

              {loadingSnapshots ? (
                <div className="text-center py-6 text-slate-500 text-xs">Loading checkpoint snapshots...</div>
              ) : snapshotHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No recovery snapshots recorded yet for this squad and level. Checkpoints trigger on challenge and score completions.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                  {snapshotHistory.map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="p-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">Rev {snap.revision}</span>
                          <span className="text-[10px] text-slate-500">{new Date(snap.created_at).toLocaleTimeString()}</span>
                          {idx === 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold">
                              LATEST
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{snap.reason}</p>
                        <div className="text-[10px] text-cyan-400 mt-1">
                          Score at snapshot: +{snap.score_at_snapshot} PTS
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          playClick();
                          setSelectedSnapshot(snap);
                        }}
                        className="px-3 py-1.5 bg-amber-950/60 border border-amber-600 hover:border-amber-400 text-amber-300 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SQUAD ROSTER & SECRETS */}
        {activeTab === 'TEAMS' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase">Squad Telemetry & Secret Roles:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {gameState?.teams?.map(t => {
                const isHacker = t.role === 'HACKER';
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border ${
                      isHacker
                        ? 'bg-rose-950/30 border-rose-600/80 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{t.id}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        isHacker ? 'bg-rose-900 text-white' : 'bg-cyan-950 text-cyan-400'
                      }`}>
                        {t.role}
                      </span>
                    </div>
                    <div className="text-[11px] truncate">{t.name}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span>Int: {t.integrity}%</span>
                      <span>Score: +{t.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: INJECT SIMULATED ATTACK */}
        {activeTab === 'INJECT' && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Inject Simulated Compromise:
            </div>
            <div className="flex items-center gap-3">
              <select
                value={injectTargetId}
                onChange={(e) => setInjectTargetId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs"
              >
                {gameState?.teams?.map(t => (
                  <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  playClick();
                  onAdminAction('INJECT_ATTACK', { targetTeamId: injectTargetId });
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer"
              >
                Trigger Breach Event
              </button>
            </div>
          </div>
        )}

        {/* RESTORE CONFIRMATION MODAL OVERLAY (Phase 6.3) */}
        {selectedSnapshot && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-slate-900 border border-amber-500 rounded-2xl p-6 space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Confirm Checkpoint Restoration
                </h4>
                <button onClick={() => setSelectedSnapshot(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>Target Squad:</span>
                  <span className="font-bold text-white">{selectedSnapshot.team_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Level:</span>
                  <span className="font-bold text-white">Level {selectedSnapshot.level_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Snapshot Revision:</span>
                  <span className="font-bold text-white">Rev {selectedSnapshot.revision}</span>
                </div>
                <div className="flex justify-between">
                  <span>Snapshot Score:</span>
                  <span className="font-bold text-emerald-400">+{selectedSnapshot.score_at_snapshot} PTS</span>
                </div>
                <div className="flex justify-between">
                  <span>Captured At:</span>
                  <span className="text-slate-400">{new Date(selectedSnapshot.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-bold">Mandatory Restoration Reason:</label>
                <textarea
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-mono"
                  placeholder="Explain why this recovery checkpoint is being restored..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Confirm & Restore'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
