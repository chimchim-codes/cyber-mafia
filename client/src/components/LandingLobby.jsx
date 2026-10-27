// client/src/components/LandingLobby.jsx
import React, { useState } from 'react';
import { Users, Terminal, Play, Settings } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

const FALLBACK_SUSPECTS = [
  { id: 'S01', name: 'Dr. Mira Sen', title: 'Senior Research Fellow' },
  { id: 'S02', name: 'Noah Mercer', title: 'Systems Architect' },
  { id: 'S03', name: 'Felix Grant', title: 'Security Lead' },
  { id: 'S04', name: 'Elena Ward', title: 'Director of Operations (Person of Interest)' }
];

export default function LandingLobby({ gameState, onJoinTeam, onStartGame, isAdmin, onOpenAdmin, isStartingGame }) {
  const [playerName, setPlayerName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('S01');

  const suspects = (gameState?.teams && gameState.teams.length > 0)
    ? gameState.teams.slice(0, 4)
    : FALLBACK_SUSPECTS;

  const handleStart = (teamId) => {
    playClick();
    const finalTeamId = teamId || selectedTeamId || 'S01';
    const finalName = playerName.trim() || 'Detective_' + Math.floor(Math.random() * 900 + 100);
    onJoinTeam(finalName, finalTeamId);
    setTimeout(() => {
      onStartGame();
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 cyber-grid relative font-mono">
      {/* Top Banner */}
      <div className="max-w-2xl w-full text-center mb-6 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs mb-2 tracking-widest uppercase">
          <Terminal className="w-3.5 h-3.5" />
          Internal Tech Fest // Murder Investigation
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-slate-100 to-rose-400">
          WHO MURDERED DR. ADRIAN VALE?
        </h1>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl z-10 space-y-5">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Investigator Name / Call-sign:</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Detective_01"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStart(selectedTeamId);
            }}
          />
        </div>

        {/* Suspect Roster */}
        <div className="space-y-2">
          <span className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" /> Key Case Suspects:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {suspects.map(suspect => (
              <div
                key={suspect.id}
                onClick={() => { playClick(); setSelectedTeamId(suspect.id); }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedTeamId === suspect.id
                    ? 'bg-cyan-950/40 border-cyan-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{suspect.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{suspect.id}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{suspect.title || 'Person of Interest'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons & Admin Controls */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <button
            onClick={() => handleStart(selectedTeamId)}
            disabled={isStartingGame}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            {isStartingGame ? 'Starting Investigation...' : 'Begin Investigation'}
          </button>

          {onOpenAdmin && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onOpenAdmin();
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isAdmin
                    ? 'bg-amber-950/60 border-amber-600 text-amber-300 hover:bg-amber-900/60'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Settings className={`w-3.5 h-3.5 ${isAdmin ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{isAdmin ? 'Admin Console' : 'Admin Login'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
