// client/src/components/AdminPanel.jsx
// Upgraded God-Mode Admin Console with Session Lifecycle, Recovery Snapshots, Resets & CSV Export

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Eye, Play, Pause, RefreshCw, Zap, 
  Bot, Settings, Skull, Shield, X, AlertTriangle, Download, 
  History, RotateCcw, CheckCircle2, FileSpreadsheet, Lock, LogOut, Check,
  Trophy, Bell, Clock
} from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

export default function AdminPanel({
  isOpen,
  onClose,
  gameState,
  onAdminAction,
  sessionId = 'default-cyber-session',
  adminKey = '',
  isAdmin = false,
  onAdminLogin,
  onAdminLogout,
  authError = null,
  securityAlerts = [],
  onClearSecurityAlerts,
  submissionAlerts = [],
  onClearSubmissionAlerts
}) {
  const [adminKeyInput, setAdminKeyInput] = useState(adminKey || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [localAuthError, setLocalAuthError] = useState(authError);

  const allAlerts = securityAlerts?.length > 0 
    ? securityAlerts 
    : (gameState?.securityAlerts || []);

  const [injectTargetId, setInjectTargetId] = useState('C02');
  const [selectedRecoveryTeam, setSelectedRecoveryTeam] = useState('C01');
  const [selectedRecoveryLevel, setSelectedRecoveryLevel] = useState(1);
  const [snapshotHistory, setSnapshotHistory] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [snapshotActionMessage, setSnapshotActionMessage] = useState(null);

  // Live Leaderboard state in Admin Panel
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Restore Modal State
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [restoreReason, setRestoreReason] = useState('Authorized administrative rollback to validated checkpoint.');
  const [isRestoring, setIsRestoring] = useState(false);

  // Reset confirmation state
  const [resetReason, setResetReason] = useState('Administrative progress reset.');
  const [isResetting, setIsResetting] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState('LIFECYCLE'); // LIFECYCLE, LEADERBOARD, SECURITY, RECOVERY, TEAMS, INJECT

  const fetchLiveLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/leaderboard?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard) setLiveLeaderboard(data.leaderboard);
      }
    } catch (e) {
      console.warn('Failed to fetch admin leaderboard:', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LEADERBOARD' && isAdmin) {
      fetchLiveLeaderboard();
      const interval = setInterval(fetchLiveLeaderboard, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isAdmin, sessionId]);

  useEffect(() => {
    setAdminKeyInput(adminKey || '');
  }, [adminKey]);

  useEffect(() => {
    setLocalAuthError(authError);
  }, [authError]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!adminKeyInput.trim()) {
      setLocalAuthError('Please enter an administrative secret key.');
      return;
    }

    setIsVerifying(true);
    setLocalAuthError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKeyInput.trim()
        }
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        playSuccess();
        setLocalAuthError(null);
        if (onAdminLogin) {
          await onAdminLogin(adminKeyInput.trim());
        }
      } else {
        playError();
        setLocalAuthError(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      playError();
      setLocalAuthError('Network error while validating key: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    playClick();
    setAdminKeyInput('');
    setLocalAuthError(null);
    if (onAdminLogout) {
      onAdminLogout();
    }
  };

  const fetchSnapshots = async (teamId, levelId) => {
    setLoadingSnapshots(true);
    setSnapshotActionMessage(null);
    try {
      const res = await fetch(`/api/admin/recovery?sessionId=${encodeURIComponent(sessionId)}&teamId=${teamId}&levelId=${levelId}`, {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSnapshotHistory(data.snapshots || []);
    } catch (err) {
      setSnapshotActionMessage({ type: 'ERROR', text: 'Failed to load recovery snapshots: ' + err.message });
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin && activeTab === 'RECOVERY') {
      fetchSnapshots(selectedRecoveryTeam, selectedRecoveryLevel);
    }
  }, [isOpen, isAdmin, activeTab, selectedRecoveryTeam, selectedRecoveryLevel]);

  if (!isOpen) return null;

  // Lifecycle Action Handlers (Phase 4)
  const handleLifecycle = async (actionType) => {
    playClick();
    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim()
        },
        body: JSON.stringify({
          action: actionType,
          sessionId,
          payload: { reason: 'Admin panel triggered ' + actionType }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
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
          'x-admin-key': adminKey.trim()
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
      if (res.ok && data.success) {
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
          'x-admin-key': adminKey.trim()
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
      if (res.ok && data.success) {
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
          'x-admin-key': adminKey.trim()
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
      if (res.ok && data.success) {
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
          'x-admin-key': adminKey.trim()
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
      if (res.ok && data.success) {
        playSuccess();
        setSnapshotActionMessage({ type: 'SUCCESS', text: `Recalculated score from audit ledger: ${data.recalculatedScore} PTS.` });
        if (onAdminAction) onAdminAction('REFRESH');
      } else {
        playError();
        setSnapshotActionMessage({ type: 'ERROR', text: data.message });
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    }
  };

  // CSV Export Handler (Phase 7)
  const handleExportCsv = () => {
    playClick();
    const url = `/api/admin/export-csv?sessionId=${encodeURIComponent(sessionId)}&adminKey=${encodeURIComponent(adminKey.trim())}`;
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

          <div className="flex items-center gap-2">
            {allAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('SECURITY')}
                className="px-3 py-1.5 bg-rose-950 border-2 border-rose-500 rounded-xl text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer animate-pulse shadow-lg shadow-rose-950"
                title="View security violations"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>{allAlerts.length} BREACH{allAlerts.length > 1 ? 'ES' : ''} DETECTED</span>
              </button>
            )}

            {/* Export CSV Button (Phase 7) */}
            {isAdmin && (
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 hover:to-green-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
                title="Download authoritative leaderboard as CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Final CSV
              </button>
            )}
          </div>
        </div>

        {/* Authentication Status & Key Login Bar */}
        <div className={`p-4 rounded-xl border text-xs space-y-3 ${
          isAdmin ? 'bg-slate-950 border-emerald-800/80' : 'bg-amber-950/20 border-amber-800/60'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className={`w-4 h-4 ${isAdmin ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="font-bold text-slate-200">
                {isAdmin ? 'Admin Authentication Status:' : 'Admin Authorization Required:'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isAdmin ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}>
                {isAdmin ? 'Authenticated' : 'Unauthenticated'}
              </span>
            </div>

            {isAdmin && (
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-slate-900 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            )}
          </div>

          {!isAdmin ? (
            <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-slate-400 text-[11px]">
                Enter the secret administrative key (<code className="text-amber-300 font-bold">ADMIN_SECRET_KEY</code>) configured on your server to access lifecycle controls, rollbacks, and resets.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_SECRET_KEY"
                  className="flex-1 min-w-[240px] bg-slate-900 border border-slate-700 focus:border-amber-500 text-amber-300 rounded-lg px-3 py-2 text-xs font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isVerifying ? 'Verifying...' : 'Authenticate & Unlock'}
                </button>
              </div>

              {localAuthError && (
                <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-lg text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{localAuthError}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Full master privileges active. Credentials securely passed to serverless APIs.</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <Check className="w-3.5 h-3.5" /> Key Verified
              </span>
            </div>
          )}
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

        {/* If Not Authenticated, lock the console tabs */}
        {!isAdmin ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <Lock className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">ADMINISTRATIVE ACTIONS LOCKED</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please enter your server's <code className="text-amber-400">ADMIN_SECRET_KEY</code> above to authenticate and unlock god-mode controls.
            </p>
          </div>
        ) : (
          <>
            {/* Real-Time Team Accusation Submission Alerts */}
            {submissionAlerts?.length > 0 && (
              <div className="p-3.5 bg-amber-950/70 border-2 border-amber-500 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                    {submissionAlerts.length} CASE ACCUSATION SUBMISSION{submissionAlerts.length > 1 ? 'S' : ''} RECEIVED
                  </span>
                  {onClearSubmissionAlerts && (
                    <button
                      onClick={onClearSubmissionAlerts}
                      className="text-[10px] text-amber-400 hover:text-white underline cursor-pointer"
                    >
                      Dismiss Alerts
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {submissionAlerts.map((sub, idx) => (
                    <div key={idx} className="bg-black/60 p-2.5 rounded-lg border border-amber-800/80 flex items-center justify-between font-mono text-[11px]">
                      <div>
                        <span className="font-bold text-cyan-300">{sub.teamName || sub.teamId}</span> ({sub.teamId}) filed accusation at <span className="text-amber-300 font-bold">{new Date(sub.timestamp || Date.now()).toLocaleTimeString()}</span>
                      </div>
                      <div className={`font-bold px-2.5 py-0.5 rounded text-[10px] uppercase ${
                        sub.isSolved ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-rose-950 text-rose-300 border border-rose-600'
                      }`}>
                        Score: {sub.score}/5 {sub.isSolved ? '— CONVICTED' : '— INCORRECT'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-800 pb-2 text-xs flex-wrap">
              {[
                { id: 'LIFECYCLE', label: 'Match Lifecycle (Start/Pause/End)' },
                { id: 'LEADERBOARD', label: '🏆 Live Standings & Times' },
                { 
                  id: 'SECURITY', 
                  label: `🚨 Proctoring Alerts (${allAlerts.length})`,
                  isAlert: allAlerts.length > 0
                },
                { id: 'RECOVERY', label: 'Recovery Snapshots & Resets' },
                { id: 'TEAMS', label: 'Squad Telemetry & Roles' },
                { id: 'INJECT', label: 'Breach Simulation' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { playClick(); setActiveTab(tab.id); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id 
                      ? tab.isAlert ? 'bg-rose-950 border border-rose-500 text-rose-200' : 'bg-amber-950/60 border border-amber-500 text-amber-300' 
                      : tab.isAlert ? 'text-rose-400 border border-rose-800/60 bg-rose-950/30 hover:bg-rose-950/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: LIVE LEADERBOARD (Admin Only) */}
            {activeTab === 'LEADERBOARD' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">Live Squad Standings & Performance Times</h4>
                        <p className="text-[11px] text-slate-400">
                          Authoritative admin leaderboard updating in real-time based on rounds, completed stages, and elapsed playing times.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { playClick(); fetchLiveLeaderboard(); }}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                      Refresh Standings
                    </button>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {(liveLeaderboard.length > 0 ? liveLeaderboard : (gameState?.leaderboard || [])).map((team, idx) => (
                      <div
                        key={team.teamId}
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
                          idx === 0 ? 'bg-amber-950/30 border-amber-500/80 shadow-sm shadow-amber-950' :
                          idx === 1 ? 'bg-slate-800/40 border-slate-600' :
                          idx === 2 ? 'bg-amber-900/10 border-amber-800/40' :
                          'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                            #{team.rank || idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{team.teamName}</span>
                              <span className="text-[10px] text-slate-500">({team.teamId})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span className="text-cyan-300 font-bold">Round/Stage: {team.currentRound || (team.completedLevels || 0) + 1} / 5</span>
                              <span>•</span>
                              <span>Stages Completed: {team.completedLevels || 0}</span>
                              <span>•</span>
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Time: {team.timeFormatted || '0s'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3 ml-auto">
                          <div>
                            <div className="font-black text-sm text-emerald-400">
                              +{team.score} PTS
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                              {team.hasSubmitted && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                                  SUBMITTED ({team.accusationScore ?? 0}/5)
                                </span>
                              )}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                team.isEliminated ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                              }`}>
                                {team.completionStatus || 'ACTIVE'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SECURITY MONITOR (Proctoring & Anti-Cheat) */}
            {activeTab === 'SECURITY' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">Proctoring & Security Violations Monitor</h4>
                        <p className="text-[11px] text-slate-400">
                          Automated audit log of fullscreen exits, window blurs, and unauthorized navigation attempts.
                        </p>
                      </div>
                    </div>
                    {allAlerts.length > 0 && (
                      <button
                        onClick={() => {
                          playClick();
                          if (onClearSecurityAlerts) onClearSecurityAlerts();
                        }}
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700 rounded-lg text-rose-300 text-xs cursor-pointer"
                      >
                        Clear Alert History
                      </button>
                    )}
                  </div>

                  {allAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <div className="text-slate-300 font-bold">No security violations recorded</div>
                      <div className="text-slate-500 mt-1">All investigators are currently operating inside compliant fullscreen environments.</div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {allAlerts.map((al, idx) => (
                        <div
                          key={al.id || idx}
                          className="p-3 bg-rose-950/30 border border-rose-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                                {al.type}
                              </span>
                              <span className="font-bold text-slate-200">
                                {al.playerName || 'Investigator'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({al.teamId || 'S01'} - {al.teamName || 'Squad'})
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-200/90 leading-tight">
                              {al.details || al.message}
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-slate-500 font-mono">
                            {al.timestamp}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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
                      onClick={() => handleLifecycle('REVEAL_ALL')}
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
                          handleLifecycle('FORCE_PHASE', { phase: p });
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
                      handleLifecycle('INJECT_ATTACK', { targetTeamId: injectTargetId });
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
          </>
        )}

      </div>
    </div>
  );
}
