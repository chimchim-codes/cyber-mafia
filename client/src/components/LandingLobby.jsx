// client/src/components/LandingLobby.jsx
// Entry Screen for FALSE TRIALS organized by init Association
// Provides distinct Player Mode (Station Registration) and Admin Mode (Authentication)

import React, { useState } from 'react';
import { 
  Terminal, Play, Shield, Monitor, AlertTriangle, 
  User, Lock, Settings, LogOut, ArrowLeft, CheckCircle2 
} from 'lucide-react';
import { playClick, playSuccess, playError, initAudio } from '../utils/soundEffects';

export default function LandingLobby({ 
  gameState, 
  onJoinTeam, 
  onStartGame, 
  isAdmin = false,
  onAdminLogin,
  onAdminLogout,
  onOpenAdmin,
  authError = null
}) {
  const [entryMode, setEntryMode] = useState('PLAYER'); // 'PLAYER' | 'ADMIN'

  // Player Mode State
  const [squadName, setSquadName] = useState(() => {
    return localStorage.getItem('cyber_mafia_team_name') || localStorage.getItem('cyber_mafia_player_name') || '';
  });

  const [systemNo, setSystemNo] = useState(() => {
    return localStorage.getItem('cyber_mafia_system_no') || '';
  });

  const [validationError, setValidationError] = useState('');

  // Admin Mode State
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [adminError, setAdminError] = useState(authError || '');
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  const handleStart = () => {
    const trimmedSquadName = squadName.trim();
    const trimmedSystemNo = systemNo.trim();

    if (!trimmedSquadName) {
      setValidationError('Squad Name is required. Please enter your team name.');
      return;
    }
    if (trimmedSquadName.length < 2 || trimmedSquadName.length > 30) {
      setValidationError('Squad Name must be between 2 and 30 characters.');
      return;
    }
    if (!trimmedSystemNo) {
      setValidationError('System No is required (e.g. SYS-04 or PC-12).');
      return;
    }
    if (trimmedSystemNo.length < 1 || trimmedSystemNo.length > 20) {
      setValidationError('System No must be between 1 and 20 characters.');
      return;
    }

    setValidationError('');
    initAudio();
    playClick();

    // Deterministic teamId derived from the squad name so teammates/reconnects match
    const cleanSlug = trimmedSquadName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const savedTeamId = localStorage.getItem('cyber_mafia_team_id');
    const savedSquadName = localStorage.getItem('cyber_mafia_team_name');
    const finalTeamId = (savedSquadName === trimmedSquadName && savedTeamId) 
      ? savedTeamId 
      : (cleanSlug ? `SQ_${cleanSlug}` : `SQ_${Math.floor(1000 + Math.random() * 9000)}`);

    // Persist identity into localStorage so reload preserves everything
    try {
      localStorage.setItem('cyber_mafia_team_name', trimmedSquadName);
      localStorage.setItem('cyber_mafia_player_name', trimmedSquadName);
      localStorage.setItem('cyber_mafia_system_no', trimmedSystemNo);
      localStorage.setItem('cyber_mafia_team_id', finalTeamId);
    } catch (e) {}

    // Request Fullscreen immediately upon user click interaction
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

    if (onJoinTeam) {
      onJoinTeam(trimmedSquadName, finalTeamId, trimmedSystemNo, trimmedSquadName);
    }

    if (onStartGame) {
      onStartGame();
    }
  };

  const handleAdminSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmedKey = adminKeyInput.trim();
    if (!trimmedKey) {
      setAdminError('Please enter an administrative secret key.');
      return;
    }

    setIsVerifyingAdmin(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': trimmedKey
        }
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        playSuccess();
        setAdminKeyInput('');
        setAdminError('');
        if (onAdminLogin) {
          await onAdminLogin(trimmedKey);
        }
        if (onOpenAdmin) {
          onOpenAdmin();
        }
      } else {
        playError();
        setAdminError(data.message || 'Authentication failed: Invalid administrative credentials.');
      }
    } catch (err) {
      playError();
      setAdminError('Network error while validating key: ' + err.message);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 cyber-grid relative font-mono">
      {/* Top Banner with Brand Identity */}
      <div className="max-w-xl w-full text-center mb-6 z-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs mb-3 tracking-widest uppercase shadow-md shadow-cyan-950/50">
          <Terminal className="w-3.5 h-3.5 animate-pulse" />
          init Association
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-slate-100 to-rose-400 tracking-tight">
          FALSE TRIALS
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          Cyber Forensic Investigation & High Tribunal Protocol. Analyze authentic telemetry logs, solve Python security stages, and deduce the truth through evidence.
        </p>
      </div>

      {/* Main Registration & Access Card */}
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl z-10 space-y-6">
        
        {/* Mode Selector Tabs: Player Mode vs Admin Mode */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/90 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => { playClick(); setEntryMode('PLAYER'); setAdminError(''); }}
            className={`py-2 px-4 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
              entryMode === 'PLAYER'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Player Mode</span>
          </button>

          <button
            type="button"
            onClick={() => { playClick(); setEntryMode('ADMIN'); setValidationError(''); }}
            className={`py-2 px-4 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
              entryMode === 'ADMIN'
                ? 'bg-amber-600 text-slate-950 shadow-md shadow-amber-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Mode</span>
          </button>
        </div>

        {/* -------------------- PLAYER MODE INTERFACE -------------------- */}
        {entryMode === 'PLAYER' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="text-xs uppercase font-bold text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Station Registration
              </div>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded">
                INVESTIGATOR PROTOCOL
              </span>
            </div>

            {/* Inline Validation Error Banner */}
            {validationError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/80 rounded-xl text-xs text-rose-200 flex items-center gap-2 font-mono shadow-md animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Squad Name & System No Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" /> Squad Name:
                </label>
                <input
                  type="text"
                  value={squadName}
                  onChange={(e) => {
                    setSquadName(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="e.g. Cyber Sentinel"
                  maxLength={30}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-inner transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStart();
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-amber-400" /> System No:
                </label>
                <input
                  type="text"
                  value={systemNo}
                  onChange={(e) => {
                    setSystemNo(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="e.g. SYS-04 or PC-12"
                  maxLength={20}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-inner transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStart();
                  }}
                />
              </div>
            </div>

            {/* Begin Game Action Button */}
            <button
              onClick={handleStart}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Play className="w-4 h-4 fill-white" />
              Begin Investigation
            </button>

            <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-3 pt-1">
              <span>🔒 Fullscreen Proctoring</span>
              <span>•</span>
              <span>🐍 5 Python Stages</span>
              <span>•</span>
              <span>⏱️ Live Stopwatch</span>
            </div>
          </div>
        )}

        {/* -------------------- ADMIN MODE INTERFACE -------------------- */}
        {entryMode === 'ADMIN' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="text-xs uppercase font-bold text-amber-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Administrative Master Authentication
              </div>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded">
                RESTRICTED ACCESS
              </span>
            </div>

            {/* Admin Error Banner */}
            {adminError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/80 rounded-xl text-xs text-rose-200 flex items-center gap-2 font-mono shadow-md animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            {isAdmin ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-600/60 space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Authenticated as Match Administrator
                </div>
                <p className="text-xs text-slate-400">
                  Your administrative credentials are valid. You have master session authority.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => {
                      playClick();
                      if (onOpenAdmin) onOpenAdmin();
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950"
                  >
                    <Settings className="w-4 h-4" />
                    Open Admin Portal
                  </button>
                  <button
                    onClick={() => {
                      playClick();
                      if (onAdminLogout) onAdminLogout();
                    }}
                    className="py-3 px-4 bg-slate-900 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-300 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Admin Secret Key:
                  </label>
                  <input
                    type="password"
                    value={adminKeyInput}
                    onChange={(e) => {
                      setAdminKeyInput(e.target.value);
                      if (adminError) setAdminError('');
                    }}
                    placeholder="Enter authoritative secret key..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-amber-300 font-mono shadow-inner transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Requires server-verified administrative key. Grants proctoring, live audit trail, and session control.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingAdmin}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {isVerifyingAdmin ? 'Validating Credentials...' : 'Authenticate & Enter Portal'}
                </button>
              </form>
            )}

            {/* Back to Player Mode Option */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setEntryMode('PLAYER');
                  setAdminError('');
                }}
                className="text-xs text-slate-400 hover:text-cyan-400 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Player Mode
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
