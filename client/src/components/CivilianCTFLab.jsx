// client/src/components/CivilianCTFLab.jsx
import React, { useState } from 'react';
import { Terminal, Shield, CheckCircle2, Award, Zap, HelpCircle, ArrowRight } from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

export default function CivilianCTFLab({ challenges, onSolveChallenge }) {
  const [selectedChallengeId, setSelectedChallengeId] = useState(
    challenges && challenges.length > 0 ? challenges[0].id : null
  );
  const [inputAnswer, setInputAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  const activeChallenge = challenges?.find(c => c.id === selectedChallengeId) || challenges?.[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!activeChallenge || !inputAnswer.trim()) return;
    playClick();
    onSolveChallenge(activeChallenge.id, inputAnswer.trim());
    setInputAnswer('');
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'BASE64': return 'text-cyan-400 border-cyan-900/60 bg-cyan-950/20';
      case 'HEX': return 'text-purple-400 border-purple-900/60 bg-purple-950/20';
      case 'HASH_ID': return 'text-amber-400 border-amber-900/60 bg-amber-950/20';
      case 'LOGIC': return 'text-emerald-400 border-emerald-900/60 bg-emerald-950/20';
      case 'PATTERN': return 'text-blue-400 border-blue-900/60 bg-blue-950/20';
      case 'STEGO': return 'text-rose-400 border-rose-900/60 bg-rose-950/20';
      default: return 'text-slate-400 border-slate-800 bg-slate-900';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Civilian Forensic CTF Lab
          </h3>
          <p className="text-[11px] text-slate-400">
            Solve cybersecurity challenges to decode intercepted payloads and unlock authoritative evidence clues.
          </p>
        </div>
        <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 px-3 py-1 rounded-lg">
          +75 PTS / Unlocked Clue
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col: Challenge List (5 cols) */}
        <div className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {challenges?.map(chal => {
            const isSelected = selectedChallengeId === chal.id;
            return (
              <button
                key={chal.id}
                onClick={() => {
                  playClick();
                  setSelectedChallengeId(chal.id);
                  setFeedback(null);
                  setInputAnswer('');
                }}
                className={`w-full p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${getCategoryColor(chal.category)}`}>
                    {chal.category}
                  </span>
                  {chal.isSolved ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SOLVED
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">{chal.difficulty}</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate">{chal.title}</div>
              </button>
            );
          })}
        </div>

        {/* Right Col: Active Challenge Terminal (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          {activeChallenge ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono">CHALLENGE // {activeChallenge.id}</span>
                  <h4 className="text-sm font-bold text-slate-100">{activeChallenge.title}</h4>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${getCategoryColor(activeChallenge.category)}`}>
                  {activeChallenge.category}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeChallenge.description}
              </p>

              {/* Challenge Prompt Box */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="text-[10px] text-slate-500">INTERCEPTED DATA STREAM:</div>
                <div className="text-cyan-300 font-mono break-all font-bold">
                  {activeChallenge.prompt}
                </div>
              </div>

              {/* Solved Status or Form */}
              {activeChallenge.isSolved ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-700/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    CHALLENGE SOLVED (+{activeChallenge.rewardScore} PTS)
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500">Unlocked Forensic Intelligence: </span>
                    <span className="text-emerald-300 font-bold">Attached to Evidence Board!</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Enter Decoded Solution / Decrypted Plaintext:</label>
                    <input
                      type="text"
                      value={inputAnswer}
                      onChange={(e) => setInputAnswer(e.target.value)}
                      placeholder="e.g. Plaintext, MD5, node string..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" /> Submit Solution & Extract Clue
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a CTF challenge to begin decoding.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
