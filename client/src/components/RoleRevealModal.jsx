// client/src/components/RoleRevealModal.jsx
import React, { useState, useEffect } from 'react';
import { Shield, Skull, CheckCircle2 } from 'lucide-react';
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
    }, 500);
    return () => clearTimeout(t);
  }, [isHacker]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className={`max-w-md w-full bg-slate-900 border rounded-2xl p-6 text-center space-y-4 shadow-2xl ${
        revealed
          ? isHacker
            ? 'border-rose-500 shadow-rose-950/60'
            : 'border-cyan-500 shadow-cyan-950/60'
          : 'border-slate-800'
      }`}>
        <div className="text-[10px] text-slate-500 uppercase">
          Assignment // Auto-deploy in {timer}s
        </div>

        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
          isHacker ? 'bg-rose-950/40 border-rose-500 text-rose-400' : 'bg-cyan-950/40 border-cyan-500 text-cyan-400'
        }`}>
          {isHacker ? <Skull className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
        </div>

        <div>
          <h2 className={`text-2xl font-black ${isHacker ? 'text-rose-400' : 'text-cyan-400'}`}>
            {revealed ? (isHacker ? 'ELENA WARD (KILLER)' : 'INVESTIGATOR') : 'DECRYPTING...'}
          </h2>
          <div className="text-xs text-slate-300 mt-1">
            Squad: <span className="text-white font-bold">{myTeam?.name} ({myTeam?.id})</span>
          </div>
        </div>

        <button
          onClick={() => { playClick(); onAcknowledge(); }}
          className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer ${
            isHacker ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Acknowledge & Proceed
        </button>
      </div>
    </div>
  );
}
