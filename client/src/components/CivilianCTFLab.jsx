// client/src/components/CivilianCTFLab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Terminal, Lock, CheckCircle2, Play, RotateCcw, 
  HelpCircle, ArrowRight, ShieldAlert, Cpu, Sparkles 
} from 'lucide-react';
import { playClick, playSuccess, playError } from '../utils/soundEffects';
import { executePythonCode } from '../utils/pythonRunner';

export default function CivilianCTFLab({
  challenges,
  currentStage = 1,
  completedStages = [],
  onSolveChallenge,
  onRequestHint,
  unlockedHints = {}
}) {
  const [selectedChallengeId, setSelectedChallengeId] = useState(
    challenges?.[currentStage - 1]?.id || challenges?.[0]?.id || 'CHAL-PY-1'
  );

  // Sync selected challenge when stage advances
  useEffect(() => {
    const nextChal = challenges?.find(c => c.stageNumber === currentStage);
    if (nextChal) {
      setSelectedChallengeId(nextChal.id);
    }
  }, [currentStage, challenges]);

  const activeChallenge = challenges?.find(c => c.id === selectedChallengeId) || challenges?.[0];

  // Code editor state per challenge
  const [codeBuffers, setCodeBuffers] = useState({});
  const [terminalOutputs, setTerminalOutputs] = useState({});
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState(null);

  const activeCode = codeBuffers[activeChallenge?.id] !== undefined 
    ? codeBuffers[activeChallenge?.id] 
    : (activeChallenge?.initialCode || '');

  const activeTerminalOutput = terminalOutputs[activeChallenge?.id] || '';

  const isCurrentActiveStage = activeChallenge?.stageNumber === currentStage;
  const isCompleted = completedStages?.includes(activeChallenge?.stageNumber) || activeChallenge?.isSolved;
  const isLocked = activeChallenge?.stageNumber > currentStage;

  const handleCodeChange = (e) => {
    const val = e.target.value;
    setCodeBuffers(prev => ({ ...prev, [activeChallenge?.id]: val }));
  };

  const handleResetCode = () => {
    playClick();
    if (activeChallenge) {
      setCodeBuffers(prev => ({ ...prev, [activeChallenge.id]: activeChallenge.initialCode }));
      setTerminalOutputs(prev => ({ ...prev, [activeChallenge.id]: 'Code reset to initial starter template.' }));
    }
  };

  const handleRunCode = () => {
    playClick();
    if (!activeChallenge) return;

    const res = executePythonCode(activeCode, activeChallenge.id);
    setTerminalOutputs(prev => ({
      ...prev,
      [activeChallenge.id]: res.output || (res.success ? 'Program finished with 0 output.' : 'Execution failed.')
    }));

    if (res.result) {
      setAnswerInput(res.result);
      playSuccess();
    }
  };

  const handleSubmitSolution = (e) => {
    e?.preventDefault();
    if (!activeChallenge || !answerInput.trim()) return;

    playClick();
    const cleanAnswer = answerInput.trim();
    
    // Check against expected or alternatives
    const isExpected = cleanAnswer.toLowerCase() === activeChallenge.expected.toLowerCase();
    const isAlternative = activeChallenge.acceptedAlternatives?.some(
      alt => alt.toLowerCase() === cleanAnswer.toLowerCase()
    );

    if (isExpected || isAlternative) {
      onSolveChallenge(activeChallenge.id, cleanAnswer, activeChallenge.stageNumber);
      setFeedback({ type: 'SUCCESS', message: `Stage ${activeChallenge.stageNumber} Solved! +${activeChallenge.rewardScore} PTS. Evidence batch unlocked!` });
      setAnswerInput('');
    } else {
      playError();
      setFeedback({ type: 'ERROR', message: `Output "${cleanAnswer}" is incorrect. Verify your code and try again.` });
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] uppercase tracking-wider mb-1">
            <Cpu className="w-3 h-3" />
            init Association // Python Forensic Lab
          </div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Sequential Cyber Forensic Challenges
          </h3>
          <p className="text-[11px] text-slate-400">
            Write and execute Python code in-game to analyze digital evidence and unlock restricted document batches.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Progress:</span>
          <span className="text-cyan-400 font-bold">Stage {Math.min(currentStage, 5)} / 5</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(stg => (
              <span 
                key={stg} 
                className={`w-2.5 h-2.5 rounded-full ${
                  completedStages.includes(stg)
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400' 
                    : stg === currentStage 
                    ? 'bg-cyan-400 animate-pulse' 
                    : 'bg-slate-700'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sequential Stage Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {challenges?.map((chal) => {
          const isSelected = selectedChallengeId === chal.id;
          const isSolved = completedStages.includes(chal.stageNumber) || chal.isSolved;
          const locked = chal.stageNumber > currentStage;

          return (
            <button
              key={chal.id}
              disabled={locked}
              onClick={() => {
                playClick();
                setSelectedChallengeId(chal.id);
                setFeedback(null);
                setAnswerInput('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950 text-white font-bold'
                  : isSolved
                  ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300'
                  : locked
                  ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-mono">STAGE {chal.stageNumber}</span>
                {isSolved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : locked ? (
                  <Lock className="w-3 h-3 text-slate-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
              <div className="text-[11px] truncate">{chal.title}</div>
            </button>
          );
        })}
      </div>

      {/* Active Challenge Workspace */}
      {activeChallenge && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Problem Briefing & Instructions (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono uppercase font-bold">
                  {activeChallenge.difficulty}
                </span>
                <span className="text-emerald-400 text-xs font-bold font-mono">
                  +{activeChallenge.rewardScore} PTS
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100">{activeChallenge.title}</h4>
                <div className="text-[11px] text-cyan-400 mt-0.5 flex items-center gap-1">
                  <Terminal className="w-3 h-3" /> Concept: {activeChallenge.concept}
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-900 pt-2">
                <span className="text-slate-500 font-bold block mb-1 uppercase text-[10px]">Case Briefing:</span>
                {activeChallenge.forensicContext}
              </div>

              <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-cyan-300 font-bold block mb-0.5 text-[10px] uppercase">Goal:</span>
                {activeChallenge.instructions}
              </div>

              {/* Evidence Reward Notice */}
              <div className="p-2.5 bg-cyan-950/30 border border-cyan-900/70 rounded-lg text-[11px] text-cyan-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Investigation Unlock: </span>
                  {activeChallenge.unlockSummary}
                </div>
              </div>

              {/* Hint Trigger */}
              <div className="border-t border-slate-900 pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onRequestHint(activeChallenge.id)}
                  className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {unlockedHints[activeChallenge.id] ? 'View Hint' : 'Request Hint'}
                </button>

                {unlockedHints[activeChallenge.id] && (
                  <span className="text-[11px] text-amber-400 font-mono">Hint Active</span>
                )}
              </div>

              {unlockedHints[activeChallenge.id] && (
                <div className="p-2.5 bg-amber-950/30 border border-amber-900/70 rounded-lg text-xs text-amber-200">
                  💡 <span className="font-bold">Forensic Hint:</span> {unlockedHints[activeChallenge.id]}
                </div>
              )}
            </div>

            {/* Output Submission Box */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Submit Challenge Output:
              </div>

              {isCompleted ? (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Stage {activeChallenge.stageNumber} Completed! Solution verified.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitSolution} className="space-y-2">
                  <input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Enter output string or run code above..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Submit Output & Unlock Evidence
                  </button>
                </form>
              )}

              {feedback && (
                <div className={`p-2.5 rounded-lg border text-xs font-mono ${
                  feedback.type === 'SUCCESS' ? 'bg-emerald-950/50 border-emerald-600 text-emerald-300' : 'bg-rose-950/50 border-rose-600 text-rose-300'
                }`}>
                  {feedback.message}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: In-Browser Python IDE & Output Console (7 Cols) */}
          <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
            {/* Python Code Editor */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner">
              <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-slate-300 ml-2">solution_stage_{activeChallenge.stageNumber}.py</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCode}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Reset to starter template"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleRunCode}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-950"
                  >
                    <Play className="w-3 h-3 fill-white" /> Run Code
                  </button>
                </div>
              </div>

              <textarea
                value={activeCode}
                onChange={handleCodeChange}
                rows={14}
                spellCheck={false}
                className="w-full bg-[#0a0f1d] text-cyan-200 font-mono text-xs p-3.5 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Simulated Python Terminal Console */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-1 text-[10px]">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  TERMINAL STDOUT (Python 3.11.4 Virtual Subshell)
                </span>
                <span>Exit Code: 0</span>
              </div>

              <pre className="p-2.5 bg-black/80 rounded-lg text-emerald-400 text-xs overflow-x-auto min-h-[70px] whitespace-pre-wrap">
                {activeTerminalOutput || '> Click "Run Code" above to execute your Python script and inspect stdout output.'}
              </pre>

              {activeTerminalOutput && !isCompleted && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      const lines = activeTerminalOutput.trim().split('\n');
                      const lastLine = lines[lines.length - 1];
                      if (lastLine) setAnswerInput(lastLine.trim());
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Copy Output to Answer Field ↑
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
