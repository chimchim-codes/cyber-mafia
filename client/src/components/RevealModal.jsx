// client/src/components/RevealModal.jsx
import React, { useEffect } from 'react';
import { Skull, ShieldCheck, AlertOctagon, Award, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess, playError } from '../utils/soundEffects';

export default function RevealModal({ revealResult, timer }) {
  if (!revealResult) return null;

  const isHacker = revealResult.actualRole === 'HACKER';

  useEffect(() => {
    if (isHacker) {
      playSuccess();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // confetti fallback
      }
    } else {
      playError();
    }
  }, [isHacker]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`max-w-md w-full bg-slate-900 border-2 rounded-2xl p-6 md:p-8 text-center space-y-5 font-mono shadow-2xl relative animate-in zoom-in-90 duration-300 ${
        isHacker ? 'border-emerald-500 shadow-emerald-950/60' : 'border-rose-500 shadow-rose-950/60'
      }`}>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">
          Tribunal Final Verdict // Auto-Proceed in {timer}s
        </div>

        {/* Verdict Badge */}
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border ${
          isHacker ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : 'bg-rose-950/40 border-rose-500 text-rose-400'
        }`}>
          {isHacker ? <Skull className="w-10 h-10 animate-bounce" /> : <ShieldCheck className="w-10 h-10" />}
        </div>

        <div>
          <h2 className={`text-2xl font-black ${isHacker ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isHacker ? '🚨 HACKER IDENTIFIED' : '❌ FALSE ACCUSATION'}
          </h2>
          <div className="text-sm text-slate-200 mt-1">
            Target Squad: <span className="font-bold">{revealResult.suspectTeamName} ({revealResult.suspectTeamId})</span>
          </div>
          <div className="text-xs font-bold uppercase mt-1">
            Secret Identity: <span className={isHacker ? 'text-rose-400' : 'text-cyan-400'}>{revealResult.actualRole}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
          {revealResult.penaltyMessage}
        </div>
      </div>
    </div>
  );
}
