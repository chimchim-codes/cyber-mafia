// client/src/components/CivilianCTFLab.jsx
import React, { useState } from 'react';
import { Terminal, CheckCircle2, Zap, HelpCircle, MapPin, Lightbulb } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function CivilianCTFLab({
  challenges,
  hintsRemaining = 3,
  hintsUsedPerLocation = {},
  unlockedHints = {},
  onSolveChallenge,
  onRequestHint
}) {
  const [selectedChallengeId, setSelectedChallengeId] = useState(
    challenges && challenges.length > 0 ? challenges[0].id : null
  );
  const [inputAnswer, setInputAnswer] = useState('');

  const activeChallenge = challenges?.find(c => c.id === selectedChallengeId) || challenges?.[0];
  const activeLocId = activeChallenge?.locationId;
  const isLocHintUsed = activeLocId ? !!hintsUsedPerLocation[activeLocId] : false;
  const currentHintText = activeLocId ? unlockedHints[activeLocId] : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!activeChallenge || !inputAnswer.trim()) return;
    playClick();
    onSolveChallenge(activeChallenge.id, inputAnswer.trim());
    setInputAnswer('');
  };

  const handleHintClick = () => {
    if (!activeLocId) return;
    if (isLocHintUsed) return;
    if (hintsRemaining <= 0) {
      alert('Maximum 3 hints allowed per whole game.');
      return;
    }
    playClick();
    onRequestHint(activeLocId);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
      {/* Minimal Top Bar with Hint Limit Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Crime Scene Locations & Labs
          </h3>
        </div>

        {/* Hints Counter: 1 per location, 3 per whole game */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Lightbulb className={`w-3.5 h-3.5 ${hintsRemaining > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
          <span className="text-[10px] text-slate-400 uppercase">HINTS REMAINING:</span>
          <span className={`font-bold font-mono ${hintsRemaining > 0 ? 'text-amber-300' : 'text-rose-400'}`}>
            {hintsRemaining} / 3
          </span>
          <span className="text-[10px] text-slate-500">(Max 1 / location)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Location & Challenge Selector */}
        <div className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {challenges?.map(chal => {
            const isSelected = selectedChallengeId === chal.id;
            return (
              <button
                key={chal.id}
                onClick={() => {
                  playClick();
                  setSelectedChallengeId(chal.id);
                  setInputAnswer('');
                }}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">{chal.category}</span>
                  {chal.isSolved ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SOLVED
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">{chal.rewardScore} PTS</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate">{chal.locationName || chal.title}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{chal.room || 'Sector Investigation'}</div>
              </button>
            );
          })}
        </div>

        {/* Right: Active Challenge & Location Hint Panel */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4">
          {activeChallenge ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">{activeChallenge.clueId || activeChallenge.id}</span>
                  <h4 className="text-sm font-bold text-slate-100">{activeChallenge.locationName || activeChallenge.title}</h4>
                </div>

                {/* Location Hint Request Button */}
                <div>
                  {isLocHintUsed ? (
                    <span className="text-[10px] px-2 py-1 rounded bg-amber-950/50 text-amber-300 border border-amber-800 flex items-center gap-1 font-mono">
                      <Lightbulb className="w-3 h-3" /> Hint Used (1/1)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleHintClick}
                      disabled={hintsRemaining <= 0}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-900/60 text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Lightbulb className="w-3 h-3" />
                      {hintsRemaining <= 0 ? 'Max 3 Used' : 'Get Location Hint'}
                    </button>
                  )}
                </div>
              </div>

              {/* Revealed Hint Box */}
              {(isLocHintUsed || currentHintText) && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/70 rounded-lg text-xs text-amber-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Location Hint (1 of 1 for this location):
                  </div>
                  <div>{currentHintText || activeChallenge.hint || 'Inspect the data stream parameters.'}</div>
                </div>
              )}

              {/* Challenge Stream Box */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Data Payload:</div>
                <div className="text-cyan-300 font-mono break-all font-bold">
                  {activeChallenge.prompt}
                </div>
              </div>

              {activeChallenge.isSolved ? (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800 rounded-xl space-y-1 text-xs">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Solved (+{activeChallenge.rewardScore} PTS)
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    Clue added to Evidence Board: <span className="text-emerald-300 font-bold">{activeChallenge.clueId}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Enter Solution:</label>
                    <input
                      type="text"
                      value={inputAnswer}
                      onChange={(e) => setInputAnswer(e.target.value)}
                      placeholder="Enter decoded answer..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" /> Submit Solution
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a location to investigate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
