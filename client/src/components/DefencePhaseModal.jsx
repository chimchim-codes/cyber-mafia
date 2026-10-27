// client/src/components/DefencePhaseModal.jsx
import React, { useState } from 'react';
import { ShieldAlert, Clock, Mic, CheckCircle2, XCircle, AlertTriangle, Users } from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

export default function DefencePhaseModal({
  activeAccusation,
  defenseStatement,
  timer,
  myTeam,
  onSubmitDefense,
  onCastVote
}) {
  const [statementInput, setStatementInput] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  if (!activeAccusation) return null;

  const isAccused = myTeam?.id === activeAccusation.suspectTeamId;
  const isAccuser = myTeam?.id === activeAccusation.accusingTeamId;

  const handleDefenseSubmit = (e) => {
    e.preventDefault();
    if (!statementInput.trim()) return;
    playClick();
    onSubmitDefense(statementInput.trim());
    setStatementInput('');
  };

  const handleVote = (vote) => {
    playClick();
    if (vote === 'GUILTY') {
      playError();
    } else {
      playSuccess();
    }
    setHasVoted(true);
    onCastVote(vote);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 border-2 border-rose-500 rounded-2xl p-6 shadow-2xl space-y-5 font-mono relative overflow-hidden animate-in fade-in duration-300">
        
        {/* Top Pulsing Alarm Bar */}
        <div className="bg-rose-950/80 border border-rose-800 -mx-6 -mt-6 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            HIGH TRIBUNAL DEFENCE PHASE // ACTIVE INDICTMENT
          </div>
          <div className="flex items-center gap-1.5 bg-black/80 px-3 py-1 rounded-lg border border-rose-700 text-rose-400 font-bold text-sm">
            <Clock className="w-4 h-4 animate-spin" />
            <span>00:{timer < 10 ? '0' + timer : timer}</span>
          </div>
        </div>

        {/* Indictment Summary */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-900 pb-2">
            <div>
              <span className="text-slate-500">ACCUSER: </span>
              <span className="text-cyan-400 font-bold">{activeAccusation.accusingTeamName} ({activeAccusation.accusingTeamId})</span>
            </div>
            <div>
              <span className="text-slate-500">DEFENDANT: </span>
              <span className="text-rose-400 font-bold">{activeAccusation.suspectTeamName} ({activeAccusation.suspectTeamId})</span>
            </div>
          </div>

          <div className="text-slate-300">
            <span className="text-slate-500">CHARGE: </span>
            {activeAccusation.indictmentNotes || 'Formal accusation filed in the murder of Dr. Adrian Vale.'}
          </div>
        </div>

        {/* Defense Statement Section */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Mic className="w-4 h-4 text-cyan-400" />
            ACCUSED SQUAD REBUTTAL / ALIBI:
          </div>

          {defenseStatement ? (
            <div className="p-3 bg-cyan-950/20 border border-cyan-800 rounded-lg text-xs text-cyan-200 italic">
              "{defenseStatement}"
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">
              {isAccused ? 'You are on trial. Submit your rebuttal to the tribunal below.' : 'Awaiting rebuttal from defendant...'}
            </div>
          )}

          {isAccused && !defenseStatement && (
            <form onSubmit={handleDefenseSubmit} className="space-y-2 pt-1">
              <input
                type="text"
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
                placeholder="Enter your alibi or evidence challenge statement..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg uppercase tracking-wider text-xs cursor-pointer"
              >
                Broadcast Rebuttal to Tribunal
              </button>
            </form>
          )}
        </div>

        {/* Jury Voting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
          <div className="text-xs text-slate-400">
            Tribunal Jury: Vote on whether to uphold the indictment.
          </div>

          {!isAccused && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote('NOT_GUILTY')}
                disabled={hasVoted}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ACQUIT (INNOCENT)
              </button>

              <button
                onClick={() => handleVote('GUILTY')}
                disabled={hasVoted}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-950"
              >
                <XCircle className="w-4 h-4" />
                CONVICT (HACKER)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
