// client/src/components/CivilianTrace.jsx
import React, { useState } from 'react';
import { Compass, Network, Activity, ArrowRight, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';
import { playClick, playSuccess } from '../utils/soundEffects';

export default function CivilianTrace({ visibleEvidence, myTeam }) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(
    visibleEvidence && visibleEvidence.length > 0 ? visibleEvidence[0].id : null
  );
  const [traceStep, setTraceStep] = useState(0);
  const [isTracing, setIsTracing] = useState(false);

  const activeEvidence = visibleEvidence?.find(e => e.id === selectedEvidenceId) || visibleEvidence?.[0];

  const handleStartTrace = () => {
    playClick();
    setIsTracing(true);
    setTraceStep(1);

    setTimeout(() => {
      setTraceStep(2);
      setTimeout(() => {
        setTraceStep(3);
        setTimeout(() => {
          setTraceStep(4);
          setIsTracing(false);
          playSuccess();
        }, 1200);
      }, 1000);
    }, 800);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Packet Flow & Anomaly Route Tracer
          </h3>
          <p className="text-[11px] text-slate-400">
            Reconstruct ingress telemetry routes to reveal partial network hop origin signatures.
          </p>
        </div>

        {/* Evidence selector */}
        {visibleEvidence?.length > 0 && (
          <select
            value={selectedEvidenceId || ''}
            onChange={(e) => {
              playClick();
              setSelectedEvidenceId(e.target.value);
              setTraceStep(0);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 focus:outline-none"
          >
            {visibleEvidence.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.id} - [{ev.attackSignature}] {ev.targetTeamId} @ {ev.timestamp}
              </option>
            ))}
          </select>
        )}
      </div>

      {visibleEvidence?.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          No anomalous incident packets in buffer to trace.
          Solve CTF challenges or wait for telemetry flags.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Visual Route Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {/* Step 1: Ingress Gateway */}
            <div className={`p-4 rounded-xl border transition-all ${
              traceStep >= 1 ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}>
              <div className="text-[10px] text-slate-400 uppercase">HOP 1 // INGRESS</div>
              <div className="font-bold text-xs text-white mt-1">CORE GATEWAY</div>
              <div className="text-[11px] text-slate-400 mt-2">
                {traceStep >= 1 ? `Port: 443 (TLS) • TLS Sig: ${activeEvidence?.packetSignature || '0x4F'}` : 'Awaiting trace initiation...'}
              </div>
            </div>

            {/* Step 2: Route / Session */}
            <div className={`p-4 rounded-xl border transition-all ${
              traceStep >= 2 ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}>
              <div className="text-[10px] text-slate-400 uppercase">HOP 2 // ROUTE</div>
              <div className="font-bold text-xs text-white mt-1">{activeEvidence?.route || '/api/v1/session'}</div>
              <div className="text-[11px] text-slate-400 mt-2">
                {traceStep >= 2 ? `Method: POST • Auth Header Tampered` : 'Pending router parse...'}
              </div>
            </div>

            {/* Step 3: Module Compromise */}
            <div className={`p-4 rounded-xl border transition-all ${
              traceStep >= 3 ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}>
              <div className="text-[10px] text-slate-400 uppercase">HOP 3 // SUBSYSTEM</div>
              <div className="font-bold text-xs text-white mt-1">{activeEvidence?.moduleAffected || 'EVIDENCE VAULT'}</div>
              <div className="text-[11px] text-slate-400 mt-2">
                {traceStep >= 3 ? `Sig: ${activeEvidence?.attackSignature} • Lock Applied` : 'Pending subsystem scan...'}
              </div>
            </div>

            {/* Step 4: Suspected Node Origin */}
            <div className={`p-4 rounded-xl border transition-all ${
              traceStep >= 4 ? 'bg-rose-950/50 border-rose-500 shadow-md shadow-rose-950 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}>
              <div className="text-[10px] text-slate-400 uppercase">HOP 4 // ORIGIN CLUE</div>
              <div className="font-bold text-xs text-rose-400 mt-1">
                {traceStep >= 4 ? `${activeEvidence?.originNodeHint || 'NODE-??'}` : 'ENCRYPTED ORIGIN'}
              </div>
              <div className="text-[11px] mt-2">
                {traceStep >= 4 ? `Confidence: ${activeEvidence?.confidence || 65}%` : 'Trace packet required'}
              </div>
            </div>
          </div>

          {/* Trace Trigger & Intelligence Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="text-cyan-400 font-bold">Incident Selected:</span> {activeEvidence?.id} | Target: {activeEvidence?.targetTeamId} | Timestamp: {activeEvidence?.timestamp}
            </div>

            <button
              onClick={handleStartTrace}
              disabled={isTracing}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-cyan-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Compass className={`w-3.5 h-3.5 ${isTracing ? 'animate-spin' : ''}`} />
              {isTracing ? 'Tracing Packet Sequence...' : 'Execute Deep Forensic Trace'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
