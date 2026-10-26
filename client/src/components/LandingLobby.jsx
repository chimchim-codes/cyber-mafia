// client/src/components/LandingLobby.jsx
import React, { useState } from 'react';
import { Shield, Skull, Users, Terminal, Play, Bot, Radio, Cpu, Award } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function LandingLobby({ gameState, onJoinTeam, onStartGame, isAdmin, onToggleAdmin }) {
  const [playerName, setPlayerName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('C01');

  const handleJoin = (teamId) => {
    playClick();
    onJoinTeam(playerName || 'Agent_' + Math.floor(Math.random() * 900 + 100), teamId);
  };

  const handleQuickDemo = () => {
    playClick();
    // Join C01 as player, and start game immediately with bot simulation
    onJoinTeam(playerName || 'Operator_Echo', 'C01');
    setTimeout(() => {
      onStartGame();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 cyber-grid relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="max-w-4xl w-full text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-mono mb-3 tracking-widest uppercase">
          <Terminal className="w-3.5 h-3.5 animate-pulse" />
          Tactical Cyber Infiltration & Social Deduction
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-slate-100 to-rose-400">
          CYBER MAFIA
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-2 max-w-xl mx-auto">
          Infiltrate, compromise, investigate, and build forensic indictments.
          Secret roles, real CTF challenges, and deception in an authoritative isolated simulation.
        </p>
      </div>

      {/* Main Lobby Card */}
      <div className="max-w-4xl w-full bg-slate-900/90 border border-slate-800 rounded-xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Player Setup */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Agent Credentials
            </h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Handle / Operator Call-sign</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Cipher_Ghost"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Rounds per Match:</span>
                <span className="text-slate-200 font-mono">5 Rounds</span>
              </div>
              <div className="flex justify-between">
                <span>Active Squads:</span>
                <span className="text-slate-200 font-mono">{gameState?.teams?.length || 8} Teams</span>
              </div>
              <div className="flex justify-between">
                <span>Infiltrators:</span>
                <span className="text-rose-400 font-mono">Secret (1-3)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleQuickDemo}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Quick Match (with Bots)
              </button>
            </div>
          </div>

          {/* Column 2 & 3: Team Roster Selection */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Select Squad Roster
              </h3>
              <span className="text-xs text-slate-500 font-mono">Max 3 Agents / Squad</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {gameState?.teams?.map((team) => {
                const isSelected = selectedTeamId === team.id;
                const isFull = team.playersCount >= 3;
                return (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      handleJoin(team.id);
                    }}
                    disabled={isFull}
                    className={`p-3 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md shadow-cyan-950'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    } ${isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-cyan-400">{team.id}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {team.playersCount}/3
                      </span>
                    </div>
                    <div className="text-xs font-medium truncate">{team.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-emerald-400" />
                      Integrity 100%
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Launch controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleAdmin}
                  className={`text-xs px-2.5 py-1 rounded border font-mono transition-colors ${
                    isAdmin ? 'bg-amber-950/60 border-amber-600 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Admin Mode: {isAdmin ? 'ON' : 'OFF'}
                </button>
              </div>

              <button
                onClick={() => onStartGame()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Start Match
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500 font-mono flex items-center gap-4">
        <span>🔒 Authoritative Server Simulation</span>
        <span>•</span>
        <span>🎯 Forensic Evidence Correlation</span>
        <span>•</span>
        <span>⚖️ 45s Indictment Defence</span>
      </div>
    </div>
  );
}
