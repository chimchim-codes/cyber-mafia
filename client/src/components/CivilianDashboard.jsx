// client/src/components/CivilianDashboard.jsx
import React, { useState } from 'react';
import { 
  Shield, Search, Terminal, Network, 
  Pin, ShieldAlert, Cpu, CheckCircle2, Activity
} from 'lucide-react';
import CivilianInspect from './CivilianInspect';
import CivilianLogs from './CivilianLogs';
import CivilianTrace from './CivilianTrace';
import CivilianCTFLab from './CivilianCTFLab';
import EvidenceBoard from './EvidenceBoard';
import { playClick } from '../utils/soundEffects';

export default function CivilianDashboard({
  gameState,
  myTeam,
  unlockedHints,
  onSolveChallenge,
  onRequestHint,
  onOpenAccusationModal
}) {
  const [activeTool, setActiveTool] = useState('LOCATIONS');

  const visibleEvidence = myTeam?.visibleEvidence || [];
  const integrity = myTeam?.integrity || 100;
  const hintsRemaining = gameState?.hintsRemaining !== undefined ? gameState.hintsRemaining : 3;
  const hintsUsedPerLocation = gameState?.hintsUsedPerLocation || {};

  return (
    <div className="space-y-4">
      {/* Top HUD Banner (Minimal) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              Dr. Adrian Vale Murder Investigation
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-100">
              {myTeam?.name || 'Investigator Unit'}
            </h2>
          </div>
        </div>

        {/* Meters */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">SCORE</span>
            <span className="text-emerald-400 font-bold">+{myTeam?.score || 0} PTS</span>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">INTEGRITY</span>
            <span className={`font-bold ${integrity > 60 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {integrity}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tool Tabs (Minimal) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-mono">
        <button
          onClick={() => { playClick(); setActiveTool('LOCATIONS'); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'LOCATIONS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> LOCATIONS & LABS
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('EVIDENCE_BOARD'); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'EVIDENCE_BOARD' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pin className="w-3.5 h-3.5" /> EVIDENCE ({visibleEvidence.length})
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('TRACE'); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'TRACE' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Network className="w-3.5 h-3.5" /> TRACE
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('LOGS'); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'LOGS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" /> LOGS ({gameState?.systemLogs?.length || 0})
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('INSPECT'); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'INSPECT' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" /> INSPECT
        </button>

        <button
          onClick={() => { playClick(); onOpenAccusationModal(); }}
          className="ml-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> ACCUSE (MCQ)
        </button>
      </div>

      {/* Tool Viewport */}
      {activeTool === 'LOCATIONS' && (
        <CivilianCTFLab
          challenges={gameState?.civilianLabChallenges}
          hintsRemaining={hintsRemaining}
          hintsUsedPerLocation={hintsUsedPerLocation}
          unlockedHints={unlockedHints}
          onSolveChallenge={onSolveChallenge}
          onRequestHint={onRequestHint}
        />
      )}

      {activeTool === 'EVIDENCE_BOARD' && (
        <EvidenceBoard
          visibleEvidence={visibleEvidence}
          onOpenAccusationModal={onOpenAccusationModal}
        />
      )}

      {activeTool === 'TRACE' && (
        <CivilianTrace visibleEvidence={visibleEvidence} myTeam={myTeam} />
      )}

      {activeTool === 'LOGS' && (
        <CivilianLogs systemLogs={gameState?.systemLogs} />
      )}

      {activeTool === 'INSPECT' && (
        <CivilianInspect myTeam={myTeam} systemLogs={gameState?.systemLogs} />
      )}
    </div>
  );
}
