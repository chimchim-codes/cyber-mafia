// client/src/components/AdminPanel.jsx
// Upgraded God-Mode Admin Console with Chronological Activity & Proctoring Audit,
// Game Reset, System Terminal & Squad Display, Stopwatch Controls, and Recovery Snapshots

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Eye, Play, Pause, RefreshCw, Zap, 
  Bot, Settings, Skull, Shield, X, AlertTriangle, Download, 
  History, RotateCcw, CheckCircle2, FileSpreadsheet, Lock, LogOut, Check,
  Clock, Monitor, Users, Search, ListFilter, Trash2, Trophy, Bell
} from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

export default function AdminPanel({
  isOpen,
  onClose,
  gameState,
  myTeam,
  onAdminAction,
  sessionId = 'default-cyber-session',
  adminKey = '',
  isAdmin = false,
  onAdminLogin,
  onAdminLogout,
  authError = null,
  securityAlerts = [],
  auditLogs = [],
  onClearSecurityAlerts,
  onClearAuditLogs,
  onResetEntireGame,
  onExitToLobby,
  elapsedSeconds = 0,
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
  const [activeTab, setActiveTab] = useState('AUDIT'); // AUDIT, LIFECYCLE, LEADERBOARD, SECURITY, TEAMS, RECOVERY, INJECT

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState('ALL'); // ALL, LOGIN, BREACH, SOLVE
  const [auditSearch, setAuditSearch] = useState('');

  const fetchLiveLeaderboard = async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/leaderboard?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leaderboard)) setLiveLeaderboard(data.leaderboard);
      }
    } catch (e) {
      console.warn('Failed to fetch admin leaderboard:', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleRemovePlayer = async (teamId, teamName) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `ARE YOU SURE you want to remove squad "${teamName || teamId}" (${teamId}) from the active match?\n\nThis will immediately disconnect them from the session and remove them from the live leaderboard.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          action: 'ADMIN_REMOVE_PLAYER',
          sessionId,
          teamId,
          payload: {
            teamId,
            reason: 'Removed by administrator via Admin Console'
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSuccess();
        fetchLiveLeaderboard();
        if (onAdminAction) {
          onAdminAction('REFRESH_STATE');
        }
      } else {
        playError();
        alert(data.message || 'Failed to remove player.');
      }
    } catch (err) {
      playError();
      alert('Network error while removing player: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'LEADERBOARD' && isAdmin) {
      fetchLiveLeaderboard();
      const interval = setInterval(fetchLiveLeaderboard, 8000);
      const handleVisChange = () => {
        if (document.visibilityState === 'visible') fetchLiveLeaderboard();
      };
      document.addEventListener('visibilitychange', handleVisChange);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisChange);
      };
    }
  }, [activeTab, isAdmin, sessionId]);
  const [serverAuditLogs, setServerAuditLogs] = useState([]);

  const fetchServerAuditLogs = async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      const res = await fetch('/api/game-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_AUDIT_TRAIL', sessionId })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setServerAuditLogs(data.logs);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch server audit trail:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'AUDIT' && isAdmin) {
      fetchServerAuditLogs();
      const interval = setInterval(fetchServerAuditLogs, 6000);
      const handleVis = () => {
        if (document.visibilityState === 'visible') fetchServerAuditLogs();
      };
      document.addEventListener('visibilitychange', handleVis);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVis);
      };
    }
  }, [activeTab, isAdmin, sessionId]);

  useEffect(() => {
    if (activeTab === 'TEAMS' && isAdmin && onAdminAction) {
      onAdminAction('REFRESH_STATE');
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          onAdminAction('REFRESH_STATE');
        }
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isAdmin]);

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

  // Format Stopwatch
  const formatStopwatch = (totalSec) => {
    const m = Math.floor(Math.max(0, totalSec || 0) / 60);
    const s = Math.max(0, totalSec || 0) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Lifecycle Action Handlers (Phase 4)
  const handleLifecycle = async (actionType, extraPayload = {}) => {
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
          payload: extraPayload
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSuccess();
        setSnapshotActionMessage({ type: 'SUCCESS', text: `Action [${actionType}] executed: ${data.message}` });
        if (onAdminAction) onAdminAction('REFRESH');
      } else {
        playError();
        setSnapshotActionMessage({ type: 'ERROR', text: data.message || `Failed to execute ${actionType}` });
      }
    } catch (err) {
      playError();
      setSnapshotActionMessage({ type: 'ERROR', text: err.message });
    }
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    playClick();
    const url = `/api/admin/export-csv?sessionId=${encodeURIComponent(sessionId)}&adminKey=${encodeURIComponent(adminKey.trim())}`;
    window.open(url, '_blank');
  };

  // Build unified chronological audit trail
  const combinedAuditTrail = [
    ...(auditLogs || []),
    ...(serverAuditLogs || []).map(l => ({
      id: l.id || `SRV-${l.created_at}`,
      timestamp: l.created_at ? new Date(l.created_at).toLocaleTimeString() : '00:00:00',
      category: l.log_type || 'SYSTEM',
      playerName: l.source || 'Server',
      systemNo: 'SYS-SRV',
      teamId: 'CORE',
      teamName: 'Init Command',
      message: l.message
    })),
    ...(allAlerts || []).map(al => ({
      id: al.id || 'SEC-' + al.timestamp,
      timestamp: al.timestamp,
      category: al.type || 'PROCTORING_BREACH',
      playerName: al.playerName || 'Investigator',
      systemNo: al.systemNo || localStorage.getItem('cyber_mafia_system_no') || 'SYS-UNKNOWN',
      teamId: al.teamId || 'C01',
      teamName: al.teamName || 'Squad',
      message: al.details || al.message || 'Security proctoring violation'
    })),
    ...(gameState?.systemLogs || []).map(log => ({
      id: log.id || 'LOG-' + log.timestamp,
      timestamp: log.timestamp,
      category: log.type || 'SYSTEM',
      playerName: log.source || 'Station',
      systemNo: localStorage.getItem('cyber_mafia_system_no') || 'SYS-01',
      teamId: myTeam?.id || 'C01',
      teamName: myTeam?.name || 'Squad',
      message: log.message
    }))
  ];

  // De-duplicate and sort chronological trail
  const uniqueAuditMap = new Map();
  combinedAuditTrail.forEach(item => {
    const key = `${item.timestamp}_${item.category}_${item.message}`;
    if (!uniqueAuditMap.has(key)) {
      uniqueAuditMap.set(key, item);
    }
  });

  const sortedAuditTrail = Array.from(uniqueAuditMap.values());

  // Filter audit trail
  const filteredAuditTrail = sortedAuditTrail.filter(ev => {
    if (auditFilter === 'LOGIN' && ev.category !== 'LOGIN' && !ev.message?.includes('[LOGIN]')) return false;
    if (auditFilter === 'BREACH' && !['FULLSCREEN_EXITED', 'WINDOW_BLUR', 'TAB_SWITCH', 'NAVIGATION_ATTEMPT', 'BREACH'].includes(ev.category) && !ev.message?.includes('BREACH')) return false;
    if (auditFilter === 'SOLVE' && ev.category !== 'STAGE_SOLVED' && ev.category !== 'FORENSIC_SOLVE' && !ev.message?.includes('solved')) return false;

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const match = 
        (ev.playerName || '').toLowerCase().includes(q) ||
        (ev.systemNo || '').toLowerCase().includes(q) ||
        (ev.teamName || '').toLowerCase().includes(q) ||
        (ev.teamId || '').toLowerCase().includes(q) ||
        (ev.message || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const activeSystemNo = localStorage.getItem('cyber_mafia_system_no') || myTeam?.systemNo || 'SYS-DEFAULT';
  const activeSquadName = myTeam?.name || localStorage.getItem('cyber_mafia_team_name') || 'Cyber Alpha (C01)';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl space-y-4 font-mono relative max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Master Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  High Tribunal Master Console
                </span>
                <span className="px-2 py-0.2 rounded text-[9px] bg-slate-950 text-cyan-300 border border-cyan-800 font-mono">
                  {sessionId}
                </span>
              </div>
              <h3 className="text-xl font-black text-white">GOD-MODE ADMIN CONSOLE</h3>
            </div>
          </div>

          {/* Active Station & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Squad and Terminal Identifier */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-inner flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-slate-500 font-bold uppercase leading-none">TEAM & STATION</span>
                <span className="font-bold text-cyan-300 text-[11px] leading-tight">
                  {activeSquadName} • <span className="text-amber-300 font-mono">{activeSystemNo}</span>
                </span>
              </div>
            </div>

            {/* Exit to Lobby Button */}
            {onExitToLobby && (
              <button
                onClick={() => { playClick(); onExitToLobby(); }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Exit current investigation and return to lobby"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit to Lobby</span>
              </button>
            )}

            {/* Reset Entire Game Button */}
            {isAdmin && onResetEntireGame && (
              <button
                onClick={() => { playClick(); onResetEntireGame(); }}
                className="px-3 py-1.5 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:from-rose-600 hover:to-red-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer animate-pulse"
                title="Erase all saved player progress, zero scores, reset stopwatch to 00:00, and return to lobby"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Game</span>
              </button>
            )}

            {/* Export CSV Button */}
            {isAdmin && (
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 hover:to-green-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
                title="Download authoritative standings as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Authentication Status & Key Login Bar */}
        <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
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
                Enter the secret administrative key (<code className="text-amber-300 font-bold">ADMIN_SECRET_KEY</code>) to unlock live audit feeds, stopwatch controls, and game resets.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_SECRET_KEY (default: cyber-mafia-secret-2026)"
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
              <span>Full master privileges active. Unrestricted movement and admin controls enabled.</span>
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
                { 
                  id: 'AUDIT', 
                  label: `📋 Chronological Activity & Audit (${filteredAuditTrail.length})`,
                  isHighlight: true 
                },
                { id: 'LIFECYCLE', label: '⏱️ Stopwatch & Lifecycle' },
                { id: 'LEADERBOARD', label: '🏆 Live Standings & Times' },
                { 
                  id: 'SECURITY', 
                  label: `🚨 Proctoring Alerts (${allAlerts.length})`,
                  isAlert: allAlerts.length > 0
                },
                { id: 'TEAMS', label: '👥 Squads & System Telemetry' },
                { id: 'RECOVERY', label: '💾 Recovery Snapshots' },
                { id: 'INJECT', label: '⚡ Simulation Inject' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { playClick(); setActiveTab(tab.id); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id 
                      ? tab.isAlert 
                        ? 'bg-rose-950 border border-rose-500 text-rose-200' 
                        : 'bg-amber-950/60 border border-amber-500 text-amber-300' 
                      : tab.isAlert 
                        ? 'text-rose-400 border border-rose-800/60 bg-rose-950/30 hover:bg-rose-950/50' 
                        : 'text-slate-400 hover:text-white'
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { playClick(); window.open('/leaderboard', '_blank'); }}
                        className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-700/80 hover:bg-cyan-900 rounded-lg text-xs text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
                        title="Open Dedicated Full-Screen Live Leaderboard for Projector"
                      >
                        <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                        Launch Projector View
                      </button>

                      <button
                        onClick={() => { playClick(); fetchLiveLeaderboard(); }}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                        Refresh Standings
                      </button>
                    </div>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {(liveLeaderboard.length === 0 && (!gameState?.leaderboard || gameState.leaderboard.length === 0)) ? (
                      <div className="text-center py-10 text-slate-500 text-xs">
                        No active players yet.
                      </div>
                    ) : (
                      (liveLeaderboard.length > 0 ? liveLeaderboard : (gameState?.leaderboard || [])).map((team, idx) => (
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
                                {!team.isEliminated && team.completionStatus !== 'ELIMINATED' && (
                                  <button
                                    onClick={() => handleRemovePlayer(team.teamId, team.teamName)}
                                    className="ml-2 px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                    title={`Remove squad ${team.teamName}`}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    Kick
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CHRONOLOGICAL ACTIVITY & PROCTORING AUDIT */}
            {activeTab === 'AUDIT' && (
              <div className="space-y-3.5">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>Chronological Login & Proctoring Violation Feed</span>
                        <span className="text-[10px] px-2 py-0.2 rounded font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                          LIVE STREAM
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Real-time audit log tracking when someone logs in, who logs in, system number, squad name, and when someone breaches or moves away from the window.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Filter Buttons */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                        {['ALL', 'LOGIN', 'BREACH', 'SOLVE'].map(f => (
                          <button
                            key={f}
                            onClick={() => { playClick(); setAuditFilter(f); }}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                              auditFilter === f
                                ? 'bg-amber-500 text-slate-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* Clear Audit History */}
                      {onClearAuditLogs && (
                        <button
                          onClick={() => { playClick(); onClearAuditLogs(); }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-700 rounded-lg text-slate-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Clear audit log history"
                        >
                          <Trash2 className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="Search by investigator name, system no (SYS-), squad ID, or violation..."
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    {auditSearch && (
                      <button
                        onClick={() => setAuditSearch('')}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Audit Timeline Rows */}
                  {filteredAuditTrail.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <div className="text-slate-300 font-bold">No events recorded matching criteria</div>
                      <div className="text-slate-500 mt-1">Audit log will automatically record logins, window blur/minimization, and challenge solves.</div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {filteredAuditTrail.map((ev, idx) => {
                        const isLogin = ev.category === 'LOGIN' || ev.message?.includes('[LOGIN]');
                        const isBreach = ['FULLSCREEN_EXITED', 'WINDOW_BLUR', 'TAB_SWITCH', 'NAVIGATION_ATTEMPT', 'BREACH'].includes(ev.category) || ev.message?.includes('BREACH');
                        const isSolve = ev.category === 'STAGE_SOLVED' || ev.category === 'FORENSIC_SOLVE' || ev.message?.includes('solved');

                        return (
                          <div
                            key={ev.id || idx}
                            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                              isBreach
                                ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                                : isLogin
                                ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-200'
                                : isSolve
                                ? 'bg-cyan-950/20 border-cyan-800/80 text-cyan-200'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="space-y-1 flex-1 min-w-[260px]">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isBreach
                                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                                    : isLogin
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                    : isSolve
                                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                                    : 'bg-slate-950 text-slate-300 border-slate-700'
                                }`}>
                                  {ev.category}
                                </span>

                                <span className="font-bold text-white flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  {ev.playerName}
                                </span>

                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-950 text-amber-300 border border-slate-800 flex items-center gap-1">
                                  <Monitor className="w-3 h-3 text-amber-400" />
                                  {ev.systemNo || 'SYS-DEFAULT'}
                                </span>

                                <span className="text-[11px] text-slate-400 font-bold">
                                  ({ev.teamName || ev.teamId})
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-tight">
                                {ev.message}
                              </p>
                            </div>

                            <div className="text-right font-mono text-[11px] text-slate-400 shrink-0">
                              <div className="flex items-center gap-1 justify-end text-slate-500">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{ev.timestamp}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: LIFECYCLE & STOPWATCH CONTROLS */}
            {activeTab === 'LIFECYCLE' && (
              <div className="space-y-4">
                {/* Active Match Stopwatch */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Investigation Duration
                      </span>
                      <div className="flex items-center gap-3">
                        <Clock className={`w-6 h-6 ${gameState?.isPaused ? 'text-slate-500' : 'text-amber-400 animate-pulse'}`} />
                        <span className="text-3xl font-black text-white font-mono">
                          {formatStopwatch(elapsedSeconds)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                          gameState?.isPaused 
                            ? 'bg-amber-950 text-amber-400 border-amber-700 animate-pulse' 
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {gameState?.isPaused ? 'STOPWATCH PAUSED' : 'STOPWATCH RUNNING'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">CURRENT STATUS</span>
                      <span className="text-xs font-bold text-slate-200">
                        {gameState?.status || 'RUNNING'} // {gameState?.phase || 'CIVILIAN_PHASE'}
                      </span>
                    </div>
                  </div>

                  {/* Lifecycle Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-900">
                    <button
                      onClick={() => handleLifecycle('START_GAME')}
                      disabled={gameState?.status === 'RUNNING' || gameState?.status === 'PAUSED'}
                      className="p-3 bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-xl text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4 fill-emerald-400" /> Start Stopwatch
                    </button>

                    <button
                      onClick={() => handleLifecycle(gameState?.isPaused ? 'RESUME_GAME' : 'PAUSE_GAME')}
                      className="p-3 bg-slate-900 border border-slate-700 hover:border-amber-500 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {gameState?.isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                      {gameState?.isPaused ? 'Resume Stopwatch' : 'Pause Stopwatch'}
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
                      <Eye className="w-4 h-4" /> Reveal All Roles
                    </button>
                  </div>
                </div>

                {/* Reset Entire Game Section */}
                {onResetEntireGame && (
                  <div className="p-4 bg-rose-950/20 border-2 border-rose-800/80 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-300 uppercase">Emergency Game Reset (Wipe All Progress)</h4>
                        <p className="text-[11px] text-slate-400">
                          Completely wipes all saved player progress, resets the stopwatch back to 00:00, and returns to the lobby.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { playClick(); onResetEntireGame(); }}
                      className="w-full py-3 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:from-rose-600 hover:to-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Erase All Progress & Reset Stopwatch
                    </button>
                  </div>
                )}

                {/* Phase Force Overrides */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase">Emergency Phase Overrides:</div>
                  <div className="flex flex-wrap gap-2">
                    {['LOBBY', 'CIVILIAN_PHASE', 'DEFENCE_PHASE', 'REVEAL_PHASE', 'GAME_OVER'].map(p => (
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

            {/* TAB: SECURITY MONITOR */}
            {activeTab === 'SECURITY' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">Proctoring Violations Log</h4>
                        <p className="text-[11px] text-slate-400">
                          Automated audit log of fullscreen exits, window blurs, and navigation attempts.
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
                      <div className="text-slate-500 mt-1">All investigators are currently operating inside compliant environments.</div>
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
                              <span className="text-[10px] bg-slate-900 px-1.5 py-0.2 rounded font-mono text-amber-300 border border-slate-800">
                                {al.systemNo || activeSystemNo}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({al.teamId || 'C01'} - {al.teamName || 'Squad'})
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

            {/* TAB: SQUADS & SYSTEM TELEMETRY */}
            {activeTab === 'TEAMS' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase flex items-center justify-between">
                  <span>Squad Telemetry & Active Stations:</span>
                  <span className="text-[11px] text-slate-500">Auto-Synced Across Sessions</span>
                </div>
                {(gameState?.teams || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No active stations registered.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {(gameState?.teams || []).map(t => {
                      const isSelf = t.id === myTeam?.id;
                      const isRemoved = Boolean(t.isEliminated || t.status === 'REMOVED_BY_ADMIN');
                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                            isSelf
                              ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                              : isRemoved
                              ? 'bg-rose-950/20 border-rose-900/50 opacity-60 text-slate-400'
                              : 'bg-slate-950 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold font-mono text-cyan-400">{t.id}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                                {t.systemNo || (isSelf ? activeSystemNo : `SYS-${t.id}`)}
                              </span>
                            </div>
                            <div className="font-semibold text-white text-xs truncate" title={t.name}>{t.name}</div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                              <span className={t.integrity > 50 ? 'text-emerald-400' : 'text-rose-400'}>
                                Int: {t.integrity}%
                              </span>
                              <span className="font-bold text-emerald-400">+{t.score} PTS</span>
                            </div>
                          </div>

                          {!isRemoved && (
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-end">
                              <button
                                onClick={() => handleRemovePlayer(t.id, t.name)}
                                className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-[10px] text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                                title={`Remove squad ${t.name}`}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: RECOVERY SNAPSHOTS */}
            {activeTab === 'RECOVERY' && (
              <div className="space-y-4">
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
                      onClick={fetchSnapshots}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Refresh Snapshots
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="px-3 py-1.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Snapshot History Table */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase">
                    <span className="flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-400" />
                      Checkpoints for {selectedRecoveryTeam} (Level {selectedRecoveryLevel}):
                    </span>
                    <span className="text-slate-500">{snapshotHistory.length} Recorded Snapshots</span>
                  </div>

                  {loadingSnapshots ? (
                    <div className="text-center py-6 text-slate-500 text-xs">Loading checkpoint snapshots...</div>
                  ) : snapshotHistory.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No recovery snapshots recorded yet for this squad and level. Checkpoints trigger automatically on stage solves.
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: INJECT SIMULATED ATTACK */}
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
          </>
        )}

      </div>
    </div>
  );
}
