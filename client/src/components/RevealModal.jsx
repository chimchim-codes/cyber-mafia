// client/src/components/RevealModal.jsx
import React, { useEffect } from 'react';
import { Skull, ShieldCheck, Download, Clock, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess, playError } from '../utils/soundEffects';

export default function RevealModal({ revealResult, timer, onClose }) {
  if (!revealResult) return null;

  const isSolved = revealResult.isSolved;
  const ts = revealResult.timestampInfo;

  useEffect(() => {
    if (isSolved) {
      playSuccess();
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {
        // fallback
      }
    } else {
      playError();
    }
  }, [isSolved]);

  const handleDownloadReceipt = () => {
    if (!ts?.reportText) return;
    const blob = new Blob([ts.reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accusation_timestamp.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className={`max-w-lg w-full bg-slate-900 border-2 rounded-2xl p-6 text-center space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 ${
        isSolved ? 'border-emerald-500 shadow-emerald-950/60' : 'border-rose-500 shadow-rose-950/60'
      }`}>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">
          Tribunal Final Verdict
        </div>

        {/* Verdict Badge */}
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
          isSolved ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : 'bg-rose-950/40 border-rose-500 text-rose-400'
        }`}>
          {isSolved ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>

        <div>
          <h2 className={`text-xl font-black ${isSolved ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isSolved ? 'CASE SOLVED: ELENA WARD CONVICTED' : 'ACCUSATION INSUFFICIENT'}
          </h2>
          <div className="text-xs text-slate-300 mt-1">
            Score: <span className="font-bold text-white">{revealResult.score || 0} / 5 Questions Correct</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
          {revealResult.penaltyMessage}
        </div>

        {/* Desktop Timestamp Receipt Card */}
        {ts && (
          <div className="p-3 bg-slate-950/90 rounded-xl border border-cyan-900/60 text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold uppercase border-b border-slate-900 pb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Timestamp Report
              </span>
              <span className="text-emerald-400">Printed to Desktop</span>
            </div>

            <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
              <div>Started: <span className="text-slate-200">{ts.startTimeStr || ts.startTime}</span></div>
              <div>Stopped: <span className="text-slate-200">{ts.stopTimeStr || ts.stopTime}</span></div>
              <div>Duration: <span className="text-amber-400 font-bold">{ts.durationStr}</span></div>
            </div>

            <button
              onClick={handleDownloadReceipt}
              className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              Download accusation_timestamp.txt
            </button>
          </div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase font-bold cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
