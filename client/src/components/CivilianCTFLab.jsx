// client/src/components/CivilianCTFLab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Terminal, Lock, CheckCircle2, Play, RotateCcw, 
  HelpCircle, ArrowRight, ShieldAlert, Cpu, Sparkles, Check, AlertCircle
} from 'lucide-react';
import { playClick, playSuccess, playError, initAudio } from '../utils/soundEffects';
import { executePythonCode } from '../utils/pythonRunner';
import { PYTHON_CHALLENGES } from '../data/caseData';

export default function CivilianCTFLab({
  challenges: propChallenges,
  currentStage = 1,
  completedStages = [],
  onSolveChallenge,
  onRequestHint,
  unlockedHints = {}
}) {
  const challenges = (propChallenges && Array.isArray(propChallenges) && propChallenges.length > 0)
    ? propChallenges
    : PYTHON_CHALLENGES;

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

  const activeChallenge = challenges?.find(c => c.id === selectedChallengeId) || challenges?.[0] || PYTHON_CHALLENGES[0];

  // Code editor state per challenge with localStorage persistence and cache versioning
  const [codeBuffers, setCodeBuffers] = useState(() => {
    try {
      const version = localStorage.getItem('cyber_mafia_code_version');
      if (version !== '2.0') {
        localStorage.removeItem('cyber_mafia_code_buffers');
        localStorage.setItem('cyber_mafia_code_version', '2.0');
        return {};
      }
      const saved = localStorage.getItem('cyber_mafia_code_buffers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [terminalOutputs, setTerminalOutputs] = useState(() => {
    try {
      const saved = localStorage.getItem('cyber_mafia_terminal_outputs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [submittedAnswers, setSubmittedAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem('cyber_mafia_submitted_answers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [feedback, setFeedback] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Sync codeBuffers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cyber_mafia_code_buffers', JSON.stringify(codeBuffers));
    } catch (e) {
      console.warn('Failed to save code buffers:', e);
    }
  }, [codeBuffers]);

  // Sync terminalOutputs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cyber_mafia_terminal_outputs', JSON.stringify(terminalOutputs));
    } catch (e) {
      console.warn('Failed to save terminal outputs:', e);
    }
  }, [terminalOutputs]);

  // Sync submittedAnswers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cyber_mafia_submitted_answers', JSON.stringify(submittedAnswers));
    } catch (e) {
      console.warn('Failed to save submitted answers:', e);
    }
  }, [submittedAnswers]);

  const activeCode = codeBuffers[activeChallenge?.id] !== undefined 
    ? codeBuffers[activeChallenge?.id] 
    : (activeChallenge?.initialCode || '');

  const activeTerminalOutput = terminalOutputs[activeChallenge?.id] || '';

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
      setTerminalOutputs(prev => ({ ...prev, [activeChallenge.id]: '> Code reset to fresh starter template.' }));
      setFeedback(null);
    }
  };

  const handleRunCode = async () => {
    initAudio();
    playClick();
    if (!activeChallenge || isRunning) return;
    setIsRunning(true);
    setFeedback(null);

    try {
      // Local execution for instant feedback/preview
      let localRes = null;
      try {
        localRes = executePythonCode(activeCode, activeChallenge.id, activeChallenge);
        if (localRes?.output) {
          setTerminalOutputs(prev => ({
            ...prev,
            [activeChallenge.id]: localRes.output
          }));
        }
      } catch (_) {}

      // Trigger authoritative backend solve action with full Python code
      const solveRes = await onSolveChallenge(
        activeChallenge.id,
        localRes?.result || '',
        activeChallenge.stageNumber,
        activeCode
      );

      if (solveRes?.output || solveRes?.stdout) {
        setTerminalOutputs(prev => ({
          ...prev,
          [activeChallenge.id]: solveRes.output || solveRes.stdout
        }));
      }

      if (solveRes?.success && solveRes?.isVerified !== false) {
        playSuccess();
        const ans = solveRes.cleanOutput || solveRes.result || localRes?.result || 'VERIFIED';
        setSubmittedAnswers(prev => ({ ...prev, [activeChallenge.id]: ans }));
        setFeedback({
          type: 'SUCCESS',
          message: solveRes.message || `Stage ${activeChallenge.stageNumber} Verified! +${activeChallenge.rewardScore} PTS awarded. Evidence batch unlocked!`
        });
      } else {
        playError();
        setFeedback({
          type: 'ERROR',
          message: solveRes?.feedback || solveRes?.message || localRes?.feedback || 'Code failed authoritative forensic verification.'
        });
      }
    } catch (err) {
      playError();
      setFeedback({
        type: 'ERROR',
        message: err.message || 'Execution error encountered. Please check your script and try again.'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleProceedToNext = () => {
    playClick();
    const nextStageNum = (activeChallenge?.stageNumber || 1) + 1;
    const nextChal = challenges?.find(c => c.stageNumber === nextStageNum);
    if (nextChal) {
      setSelectedChallengeId(nextChal.id);
      setFeedback(null);
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
            Write authentic Python code to extract forensic signatures. Code must execute correctly to unlock the next level.
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
              }}
              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950 text-white font-bold'
                  : isSolved
                  ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300'
                  : locked
                  ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
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
              <div className="text-[11px] truncate font-medium">{chal.title}</div>
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

            {/* Objective Status Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Stage Objective Verification:
              </div>

              {isCompleted ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold">Stage {activeChallenge.stageNumber} Completed! Verified via Code Execution.</span>
                  </div>
                  {submittedAnswers[activeChallenge.id] && (
                    <div className="text-[11px] text-emerald-300/90 pl-6 font-mono">
                      Verified Output: <span className="bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/60 font-bold">{submittedAnswers[activeChallenge.id]}</span>
                    </div>
                  )}

                  {activeChallenge.stageNumber < 5 && (
                    <button
                      type="button"
                      onClick={handleProceedToNext}
                      className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Proceed to Stage {activeChallenge.stageNumber + 1}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Execution & Progression Rule:
                    </div>
                    Write your Python solution in the workspace on the right and click <span className="text-emerald-400 font-bold">Run & Verify Code</span>.
                    The next level unlocks <span className="text-slate-200 font-bold">only</span> when your code executes through the proper logic and outputs the matching solution.
                  </div>

                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={handleRunCode}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{isRunning ? 'Executing Script...' : 'Run & Verify Python Code'}</span>
                  </button>
                </div>
              )}

              {feedback && (
                <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                  feedback.type === 'SUCCESS' ? 'bg-emerald-950/50 border-emerald-600 text-emerald-300' : 'bg-rose-950/50 border-rose-600 text-rose-300'
                }`}>
                  {feedback.type === 'SUCCESS' ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
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
                    title="Reset to fresh starter template"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={handleRunCode}
                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950 disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-white" /> Run & Verify
                  </button>
                </div>
              </div>

              <textarea
                value={activeCode}
                onChange={handleCodeChange}
                rows={15}
                spellCheck={false}
                placeholder="Write your Python code here..."
                className="w-full bg-[#0a0f1d] text-cyan-200 font-mono text-xs p-3.5 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Simulated Python Terminal Console */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-1 text-[10px]">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  TERMINAL STDOUT (Python 3.11 Virtual Subshell)
                </span>
                <span>Authoritative Sandbox</span>
              </div>

              <pre className="p-2.5 bg-black/90 rounded-lg text-emerald-400 text-xs overflow-x-auto min-h-[85px] whitespace-pre-wrap font-mono">
                {activeTerminalOutput || '> Click "Run & Verify" above to execute your Python script and inspect stdout output.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
