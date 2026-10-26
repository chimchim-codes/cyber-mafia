// client/src/components/AdminPanel.jsx
import React, { useState } from 'react';
import { 
  ShieldAlert, Eye, Play, Pause, RefreshCw, Zap, 
  Bot, Settings, Skull, Shield, X, AlertTriangle 
} from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function AdminPanel({
  isOpen,
  onClose,
  gameState,
  onAdminAction
}) {
  const [injectTargetId, setInjectTargetId] = useState('C02');
  const [teamsCountSetting, setTeamsCountSetting] = useState(8);
  const [hackersCountSetting, setHackersCountSetting] = useState(2);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl space-y-5 font-mono relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-400">
            <Settings className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
              Authoritative Master Control
            </span>
            <h3 className="text-xl font-black text-white">GOD-MODE ADMIN CONSOLE</h3>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => {
              playClick();
              onAdminAction('PAUSE_RESUME');
            }}
            className="p-2.5 bg-slate-950 border border-slate-700 hover:border-amber-500 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {gameState?.isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
            {gameState?.isPaused ? 'Resume Match' : 'Pause Match'}
          </button>

          <button
            onClick={() => {
              playClick();
              onAdminAction('REVEAL_ALL');
            }}
            className="p-2.5 bg-slate-950 border border-slate-700 hover:border-amber-500 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-cyan-400" /> Reveal All Roles
          </button>

          <button
            onClick={() => {
              playClick();
              onAdminAction('TOGGLE_BOTS');
            }}
            className="p-2.5 bg-slate-950 border border-slate-700 hover:border-amber-500 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-purple-400" /> Toggle Bot AI
          </button>

          <button
            onClick={() => {
              playClick();
              onAdminAction('RESET_GAME');
            }}
            className="p-2.5 bg-slate-950 border border-rose-900 hover:border-rose-500 rounded-xl text-xs text-rose-400 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Reset Match
          </button>
        </div>

        {/* Phase Overrides */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase">Force Phase Transition:</div>
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

        {/* God View: All Teams & True Roles */}
        <div className="space-y-2">
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

        {/* Inject Simulated Attack */}
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

      </div>
    </div>
  );
}
