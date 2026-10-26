// client/src/components/RoleRevealModal.jsx
import React, { useState, useEffect } from 'react';
import { Shield, Skull, AlertTriangle, Eye, CheckCircle2, Lock } from 'lucide-react';
import { playClick, playHackGlitch, playSuccess } from '../utils/soundEffects';

export default function RoleRevealModal({ myTeam, timer, onAcknowledge }) {
  const [revealed, setRevealed] = useState(false);
  const isHacker = myTeam?.role === 'HACKER';

  useEffect(() => {
    const t = setTimeout(() => {
      setRevealed(true);
      if (isHacker) {
        playHackGlitch();
      } else {
        playSuccess();
      }
    }, 800);
    return () => clearTimeout(t);
  }, [isHacker]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`max-w-lg w-full bg-slate-900 border rounded-2xl p-6 md:p-8 text-center relative overflow-hidden shadow-2xl transition-all duration-700 ${
        revealed
          ? isHacker
            ? 'border-rose-500/80 shadow-rose-950/60'
            : 'border-cyan-500/80 shadow-cyan-950/60'
          : 'border-slate-700'
      }`}>
        {/* Top classified stamp */}
        <div className="flex justify-between items-center text-xs font-mono mb-4 text-slate-500 border-b border-slate-800 pb-3">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            TOP SECRET // EYES ONLY
          </span>
          <span className="text-amber-400 font-bold">Auto-Deploy: {timer}s</span>
        </div>

        {/* Icon & Title */}
        <div className="my-6">
          <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border transition-all duration-700 ${
            revealed
              ? isHacker
                ? 'bg-rose-950/40 border-rose-500 text-rose-400 scale-110 shadow-lg shadow-rose-900/50'
                : 'bg-cyan-950/40 border-cyan-500 text-cyan-400 scale-110 shadow-lg shadow-cyan-900/50'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {isHacker ? <Skull className="w-10 h-10 animate-pulse" /> : <Shield className="w-10 h-10" />}
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400">Classified Assignment</div>
            <h2 className={`text-3xl font-black mt-1 tracking-tight ${
              isHacker ? 'text-rose-400' : 'text-cyan-400'
            }`}>
              {revealed ? (isHacker ? 'HACKER CELL' : 'CIVILIAN DEFENDER') : 'DECRYPTING DOSSIER...'}
            </h2>
            <div className="text-sm font-mono text-slate-300 mt-1">
              Squad: <span className="text-white font-bold">{myTeam?.name} ({myTeam?.id})</span>
            </div>
          </div>
        </div>

        {/* Role Directives */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left text-xs space-y-2.5 text-slate-300 mb-6">
          <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Operational Directives:
          </div>
          {isHacker ? (
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Target civilian teams secretly using <span className="text-rose-300 font-mono">Cookie Shift, Token Hunt, Route Break, Packet Decode</span>.</li>
              <li>Solve live CTF attack payloads to compromise target modules.</li>
              <li>Use <span className="text-amber-300 font-mono">Spoof, Erase & Misdirect</span> abilities to mask your forensic trail.</li>
              <li>Blend into public chat and avoid detection during tribunals.</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Monitor system integrity and investigate security anomalies.</li>
              <li>Inspect cookies, logs, headers, and trace packet paths.</li>
              <li>Solve <span className="text-cyan-300 font-mono">CTF Forensic Labs</span> to unlock classified intelligence.</li>
              <li>Connect clues on the Evidence Board and indict suspected hackers!</li>
            </ul>
          )}
        </div>

        {/* Deploy Button */}
        <button
          onClick={() => {
            playClick();
            onAcknowledge();
          }}
          className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isHacker
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Acknowledge & Enter Command Center
        </button>
      </div>
    </div>
  );
}
