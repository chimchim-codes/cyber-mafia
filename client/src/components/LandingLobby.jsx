// client/src/components/LandingLobby.jsx
import React, { useState } from 'react';
import { Users, Terminal, Play, Shield, Lock } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

const DEFAULT_SUSPECTS = [
  { id: 'S01', name: 'Dr. Mira Sen', title: 'Senior Research Fellow' },
  { id: 'S02', name: 'Noah Mercer', title: 'Lead Systems Architect' },
  { id: 'S03', name: 'Felix Grant', title: 'Security Operations Lead' },
  { id: 'S04', name: 'Elena Ward', title: 'Director of Operations' }
];

export default function LandingLobby({ gameState, onJoinTeam, onStartGame, isAdmin }) {
  const [playerName, setPlayerName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('S01');

  const suspects = (gameState?.teams && gameState.teams.length > 0)
    ? gameState.teams.slice(0, 4)
    : DEFAULT_SUSPECTS;

  const handleStart = (teamId) => {
    playClick();
    const finalTeamId = teamId || selectedTeamId || 'S01';
    const finalName = playerName.trim() || 'Investigator_' + Math.floor(Math.random() * 900 + 100);
    onJoinTeam(finalName, finalTeamId);
    setTimeout(() => {
      onStartGame();
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
          Cyber Forensic Investigation & High Tribunal Tribunal Protocol. Analyze conflicting evidence, solve Python security stages, and unmask the truth.
        </p>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl z-10 space-y-6">
        <div>
          <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider font-semibold">
            Investigator Name / Call-Sign:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Detective_01"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStart(selectedTeamId);
            }}
          />
        </div>

        {/* Suspect Roster (Equal suspicion, no spoilers) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-bold flex items-center gap-1.5 text-slate-300">
              <Users className="w-4 h-4 text-cyan-400" /> Key Case Suspects:
            </span>
            <span className="text-[11px] text-slate-500">Conflicting Evidence Logged</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {suspects.map(suspect => (
              <div
                key={suspect.id}
                onClick={() => { playClick(); setSelectedTeamId(suspect.id); }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTeamId === suspect.id
                    ? 'bg-cyan-950/50 border-cyan-500 text-white font-bold shadow-md shadow-cyan-950'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200">{suspect.name}</span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
                    {suspect.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{suspect.title}</div>
              </div>
            ))}
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
          <span>🔒 Progressive Evidence Unlocking</span>
          <span>•</span>
          <span>🐍 5 Python Forensic Stages</span>
          <span>•</span>
          <span>⚖️ Tribunal Indictment</span>
        </div>
      </div>
    </div>
  );
}
