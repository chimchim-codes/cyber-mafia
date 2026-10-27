// client/src/components/LandingLobby.jsx
// Entry Screen for FALSE TRIALS organized by init Association
// Prompts for Investigator Name, System No, and Squad Name without showing suspects

import React, { useState } from 'react';
import { Terminal, Play, Shield, Monitor, Users, CheckCircle2 } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

const SQUAD_OPTIONS = [
  { id: 'C01', name: 'Cyber Alpha', badge: 'Squad 01' },
  { id: 'C02', name: 'Grid Shield', badge: 'Squad 02' },
  { id: 'C03', name: 'Neural Sentinel', badge: 'Squad 03' },
  { id: 'C04', name: 'Binary Vanguard', badge: 'Squad 04' },
  { id: 'C05', name: 'Quantum Watch', badge: 'Squad 05' },
  { id: 'C06', name: 'Dark Matrix', badge: 'Squad 06' },
  { id: 'C07', name: 'Cipher Guard', badge: 'Squad 07' },
  { id: 'C08', name: 'Aegis Core', badge: 'Squad 08' }
];

export default function LandingLobby({ gameState, onJoinTeam, onStartGame, isAdmin }) {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('cyber_mafia_player_name') || '';
  });

  const [systemNo, setSystemNo] = useState(() => {
    return localStorage.getItem('cyber_mafia_system_no') || '';
  });

  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    return localStorage.getItem('cyber_mafia_team_id') || 'C01';
  });

  const [customTeamName, setCustomTeamName] = useState(() => {
    return localStorage.getItem('cyber_mafia_team_name') || '';
  });

  const handleStart = (teamId) => {
    playClick();
    const finalTeamId = teamId || selectedTeamId || 'C01';
    const finalName = playerName.trim() || 'Investigator_' + Math.floor(Math.random() * 900 + 100);
    const finalSystemNo = systemNo.trim() || 'SYS-' + (Math.floor(Math.random() * 90 + 10));
    const matchedSquad = SQUAD_OPTIONS.find(s => s.id === finalTeamId);
    const finalTeamName = customTeamName.trim() || (matchedSquad ? matchedSquad.name : `Squad ${finalTeamId}`);

    // Persist identity into localStorage so reload preserves everything
    try {
      localStorage.setItem('cyber_mafia_player_name', finalName);
      localStorage.setItem('cyber_mafia_system_no', finalSystemNo);
      localStorage.setItem('cyber_mafia_team_id', finalTeamId);
      localStorage.setItem('cyber_mafia_team_name', finalTeamName);
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
      onJoinTeam(finalName, finalTeamId, finalSystemNo, finalTeamName);
    }

    setTimeout(() => {
      if (onStartGame) onStartGame();
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 cyber-grid relative font-mono">
      {/* Top Banner with Brand Identity */}
      <div className="max-w-2xl w-full text-center mb-6 z-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs mb-3 tracking-widest uppercase shadow-md shadow-cyan-950/50">
          <Terminal className="w-3.5 h-3.5 animate-pulse" />
          init Association
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-slate-100 to-rose-400 tracking-tight">
          FALSE TRIALS
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-md mx-auto">
          Cyber Forensic Investigation & High Tribunal Protocol. Analyze authentic telemetry logs, solve Python security stages, and deduce the truth through evidence.
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl z-10 space-y-5">
        
        {/* Investigator Name & System Number Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-300 block mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Investigator Name / Call-Sign:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Detective_Vance"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStart(selectedTeamId);
              }}
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1.5 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-amber-400" /> System No. / Terminal ID:
            </label>
            <input
              type="text"
              value={systemNo}
              onChange={(e) => setSystemNo(e.target.value)}
              placeholder="e.g. SYS-04 or PC-12"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStart(selectedTeamId);
              }}
            />
          </div>
        </div>

        {/* Squad / Team Selector (No Suspect List) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="uppercase font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" /> Select Investigation Squad:
            </span>
            <span className="text-[11px] text-slate-500">8 Units Assigned</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {SQUAD_OPTIONS.map(squad => (
              <div
                key={squad.id}
                onClick={() => { playClick(); setSelectedTeamId(squad.id); }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedTeamId === squad.id
                    ? 'bg-cyan-950/60 border-cyan-500 text-white font-bold shadow-md shadow-cyan-950/50 scale-[1.02]'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[10px] text-cyan-400 bg-slate-900 px-1 rounded border border-slate-800">
                    {squad.id}
                  </span>
                  {selectedTeamId === squad.id && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
                <div className="font-semibold text-slate-200 text-xs truncate">{squad.name}</div>
                <div className="text-[10px] text-slate-500">{squad.badge}</div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Custom Team Name (Optional override):
            </label>
            <input
              type="text"
              value={customTeamName}
              onChange={(e) => setCustomTeamName(e.target.value)}
              placeholder="e.g. Cyber Alpha Prime (leave blank to use default)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleStart(selectedTeamId)}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
        >
          <Play className="w-4 h-4 fill-white" />
          Begin Investigation
        </button>

        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-3 pt-1">
          <span>🔒 Fullscreen Proctoring Enforcement</span>
          <span>•</span>
          <span>🐍 5 Python Forensic Stages</span>
          <span>•</span>
          <span>⏱️ Live Stopwatch Tracking</span>
        </div>
      </div>
    </div>
  );
}
