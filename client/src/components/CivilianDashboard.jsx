// client/src/components/CivilianDashboard.jsx
import React, { useState } from 'react';
import { 
  Shield, AlertTriangle, Search, Terminal, Network, 
  Pin, ShieldAlert, Cpu, CheckCircle2, Lock, Activity
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
  onSolveChallenge,
  onOpenAccusationModal,
  onPrepareAccusation
}) {
  const [activeTool, setActiveTool] = useState('DASHBOARD');

  const visibleEvidence = myTeam?.visibleEvidence || [];
  const integrity = myTeam?.integrity || 100;
  const isVaultDisabled = myTeam?.modules?.evidenceVault === 'DISABLED';
  const isNetDisabled = myTeam?.modules?.networkMonitor === 'DISABLED';
  const isInvDisabled = myTeam?.modules?.investigation === 'DISABLED';

  return (
    <div className="space-y-6">
      {/* Top HUD Banner */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-900/60 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Security Command Center</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
                MONITORING ACTIVE
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100">
              {myTeam?.name} ({myTeam?.id})
            </h2>
          </div>
        </div>

        {/* Health & Score Meters */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">TEAM SCORE</span>
            <span className="text-emerald-400 font-bold text-sm">+{myTeam?.score || 0} PTS</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-lg">
            <span className="text-slate-500 block text-[10px]">SYSTEM INTEGRITY</span>
            <span className={`font-bold text-sm ${integrity > 60 ? 'text-cyan-400' : integrity > 30 ? 'text-amber-400' : 'text-rose-400'}`}>
              {integrity}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tool Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 text-xs font-mono">
        <button
          onClick={() => { playClick(); setActiveTool('DASHBOARD'); }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'DASHBOARD' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> OVERVIEW
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('INSPECT'); }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'INSPECT' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" /> INSPECT
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('LOGS'); }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'LOGS' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" /> LOGS ({gameState?.systemLogs?.length || 0})
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('TRACE'); }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'TRACE' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Network className="w-3.5 h-3.5" /> TRACE
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('CTF_LAB'); }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'CTF_LAB' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> CTF LAB
        </button>

        <button
          onClick={() => { playClick(); setActiveTool('EVIDENCE_BOARD'); }}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTool === 'EVIDENCE_BOARD' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pin className="w-3.5 h-3.5" /> EVIDENCE BOARD ({visibleEvidence.length})
        </button>

        <button
          onClick={() => { playClick(); onOpenAccusationModal(); }}
          className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> ACCUSE
        </button>
      </div>

      {/* Active Tool Viewport */}
      {activeTool === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Subsystem Health Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">DASHBOARD</span>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> ACTIVE
              </div>
              <p className="text-[11px] text-slate-400">Telemetry feed nominal</p>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">INVESTIGATION</span>
              <div className={`text-base font-bold flex items-center gap-1.5 ${isInvDisabled ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isInvDisabled ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isInvDisabled ? 'DISABLED' : 'ACTIVE'}
              </div>
              <p className="text-[11px] text-slate-400">Forensic tooling status</p>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">EVIDENCE VAULT</span>
              <div className={`text-base font-bold flex items-center gap-1.5 ${isVaultDisabled ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isVaultDisabled ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isVaultDisabled ? 'COMPROMISED' : 'ACTIVE'}
              </div>
              <p className="text-[11px] text-slate-400">{visibleEvidence.length} Forensic Records</p>
            </div>

            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">NETWORK MONITOR</span>
              <div className={`text-base font-bold flex items-center gap-1.5 ${isNetDisabled ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isNetDisabled ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isNetDisabled ? 'BLINDED' : 'ACTIVE'}
              </div>
              <p className="text-[11px] text-slate-400">Packet stream sensor</p>
            </div>
          </div>

          {/* Quick Anomaly Alerts */}
          {visibleEvidence.length > 0 ? (
            <div className="p-4 bg-rose-950/30 border border-rose-900/60 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold font-mono">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                ACTIVE INFILTRATION INCIDENTS DETECTED ({visibleEvidence.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {visibleEvidence.slice(0, 4).map(ev => (
                  <div key={ev.id} className="p-2.5 bg-black/60 rounded-lg border border-rose-950 flex justify-between items-center">
                    <div>
                      <span className="text-cyan-400 font-bold">{ev.id}</span>
                      <span className="text-slate-400 text-[11px] ml-2">[{ev.attackSignature}] @ {ev.timestamp}</span>
                    </div>
                    <button
                      onClick={() => { playClick(); setActiveTool('TRACE'); }}
                      className="text-[11px] text-rose-300 hover:text-white underline cursor-pointer"
                    >
                      Trace Route →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              All sector telemetry within expected baseline tolerances.
              Solve CTF Labs to build proactive intelligence before the next breach.
            </div>
          )}
        </div>
      )}

      {activeTool === 'INSPECT' && <CivilianInspect myTeam={myTeam} systemLogs={gameState?.systemLogs} />}
      {activeTool === 'LOGS' && <CivilianLogs systemLogs={gameState?.systemLogs} />}
      {activeTool === 'TRACE' && <CivilianTrace visibleEvidence={visibleEvidence} myTeam={myTeam} />}
      {activeTool === 'CTF_LAB' && <CivilianCTFLab challenges={gameState?.civilianLabChallenges} onSolveChallenge={onSolveChallenge} />}
      {activeTool === 'EVIDENCE_BOARD' && (
        <EvidenceBoard
          visibleEvidence={visibleEvidence}
          allTeams={gameState?.teams}
          myTeam={myTeam}
          onPrepareAccusation={onPrepareAccusation}
        />
      )}
    </div>
  );
}
