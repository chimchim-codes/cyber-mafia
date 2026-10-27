// client/src/components/AccusationModal.jsx
import React, { useState } from 'react';
import { ShieldAlert, X, Send, CheckCircle2, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import { playClick, playAlarm } from '../utils/soundEffects';

const MCQ_QUESTIONS = [
  {
    id: 'q1',
    number: 1,
    question: 'Who murdered Dr. Adrian Vale?',
    type: 'single',
    options: [
      { key: 'A', label: 'Dr. Mira Sen' },
      { key: 'B', label: 'Noah Mercer' },
      { key: 'C', label: 'Felix Grant' },
      { key: 'D', label: 'Elena Ward' }
    ]
  },
  {
    id: 'q2',
    number: 2,
    question: 'What was the murder weapon or method?',
    type: 'single',
    options: [
      { key: 'A', label: 'Poison administered through a drink' },
      { key: 'B', label: 'Tampered laboratory equipment' },
      { key: 'C', label: 'A lethal injection' },
      { key: 'D', label: 'Blunt-force trauma' }
    ]
  },
  {
    id: 'q3',
    number: 3,
    question: 'What was the killer’s primary motive?',
    type: 'single',
    options: [
      { key: 'A', label: 'Revenge over a personal conflict' },
      { key: 'B', label: 'Preventing Adrian from exposing unauthorized research exports' },
      { key: 'C', label: 'Stealing Adrian’s research position' },
      { key: 'D', label: 'Retaliation for revoked system access' }
    ]
  },
  {
    id: 'q4',
    number: 4,
    question: 'Who assisted the killer in carrying out or concealing the crime?',
    type: 'single',
    options: [
      { key: 'A', label: 'Dr. Mira Sen' },
      { key: 'B', label: 'Noah Mercer' },
      { key: 'C', label: 'Felix Grant' },
      { key: 'D', label: 'No accomplice has been established' }
    ]
  },
  {
    id: 'q5',
    number: 5,
    question: 'Which pieces of evidence support the accusation? (Select all that apply.)',
    type: 'multi',
    options: [
      { key: 'A', label: 'TOX-102 — Forensic Toxicology report confirming organophosphate poisoning' },
      { key: 'B', label: 'MEM-501 — Recovered deleted emails exposing Elena\'s $12M model export and intent to silence Adrian before 09:00' },
      { key: 'C', label: 'WIT-503 & SEC-502 — Witness statement and door audit confirming Elena delivered coffee to Adrian at 08:28-08:31' },
      { key: 'D', label: 'BIO-602 & LOG-601 — Biometric DNA / fingerprint match on the poison mug handle and latest gateway login' }
    ]
  }
];

export default function AccusationModal({
  isOpen,
  onClose,
  onSubmitAccusation,
  hasAlreadySubmitted = false
}) {
  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: []
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleSelectSingle = (qId, optionKey) => {
    playClick();
    setErrorMsg('');
    setAnswers(prev => ({
      ...prev,
      [qId]: optionKey
    }));
  };

  const handleToggleMulti = (optionKey) => {
    playClick();
    setErrorMsg('');
    setAnswers(prev => {
      const current = prev.q5 || [];
      const updated = current.includes(optionKey)
        ? current.filter(k => k !== optionKey)
        : [...current, optionKey];
      return { ...prev, q5: updated };
    });
  };

  const handlePreSubmitCheck = (e) => {
    e.preventDefault();
    if (!answers.q1 || !answers.q2 || !answers.q3 || !answers.q4) {
      setErrorMsg('Please answer Questions 1 through 4.');
      return;
    }
    if (!answers.q5 || answers.q5.length === 0) {
      setErrorMsg('Please select supporting evidence in Question 5.');
      return;
    }

    playClick();
    setIsConfirming(true);
  };

  const handleFinalSubmit = () => {
    playAlarm();
    onSubmitAccusation(answers);
    setIsConfirming(false);
    onClose();
  };

  // If already submitted, prevent spamming
  if (hasAlreadySubmitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-2xl relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/60 border border-amber-600 flex items-center justify-center text-amber-400">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">SUBMISSION ALREADY RECORDED</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your squad has already submitted its official accusation for this match.
              Each team is strictly allowed <span className="text-amber-400 font-bold">ONE (1) submission</span> to prevent spamming.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-rose-600/80 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4 font-mono relative my-auto animate-in fade-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Minimal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-600 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">
              Tribunal Indictment // Murder of Dr. Adrian Vale
            </div>
            <h3 className="text-base font-black text-white">FILE KILLER ACCUSATION</h3>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Confirmation Modal Overlay (Spam & Single Submission Warning) */}
        {isConfirming ? (
          <div className="p-4 bg-slate-950 border-2 border-amber-500/80 rounded-xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm border-b border-slate-800 pb-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
              CONFIRM FINAL SUBMISSION (ONE-TIME ONLY)
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg text-[11px] text-amber-200 leading-relaxed space-y-1">
              <div className="font-bold uppercase tracking-wider text-amber-300">⚠️ Anti-Spam Notice:</div>
              <div>
                Each team is strictly allowed <span className="font-bold underline text-white">ONLY ONE SUBMISSION</span> per match.
                Once confirmed, you cannot edit, re-submit, or spam additional accusations.
              </div>
              <div>
                An official <span className="text-cyan-300 font-bold">PDF Forensic Record</span> will be generated and downloaded automatically, and the Game Master will be immediately notified.
              </div>
            </div>

            {/* Selections Summary */}
            <div className="space-y-1.5 bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
              <div className="text-slate-500 uppercase font-bold text-[10px] mb-1">Your Selected Indictment:</div>
              <div>• Killer: <span className="text-cyan-300 font-bold">{MCQ_QUESTIONS[0].options.find(o => o.key === answers.q1)?.label || answers.q1}</span></div>
              <div>• Method: <span className="text-cyan-300 font-bold">{MCQ_QUESTIONS[1].options.find(o => o.key === answers.q2)?.label || answers.q2}</span></div>
              <div>• Motive: <span className="text-cyan-300 font-bold">{MCQ_QUESTIONS[2].options.find(o => o.key === answers.q3)?.label || answers.q3}</span></div>
              <div>• Accomplice: <span className="text-cyan-300 font-bold">{MCQ_QUESTIONS[3].options.find(o => o.key === answers.q4)?.label || answers.q4}</span></div>
              <div>• Evidence: <span className="text-cyan-300 font-bold">{answers.q5?.join(', ')} ({answers.q5?.length || 0} artifacts selected)</span></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Review Answers
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-950 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Yes, Confirm & Submit Once
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmitCheck} className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
            {MCQ_QUESTIONS.map((q) => (
              <div key={q.id} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-slate-200 text-xs">
                  {q.number}. {q.question}
                </div>

                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {q.type === 'single' ? (
                    q.options.map(opt => {
                      const isSelected = answers[q.id] === opt.key;
                      return (
                        <button
                          type="button"
                          key={opt.key}
                          onClick={() => handleSelectSingle(q.id, opt.key)}
                          className={`text-left p-2.5 rounded-lg border transition-all flex items-center gap-2.5 cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-rose-950/50 border-rose-500 text-white font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${
                            isSelected ? 'bg-rose-600 text-white border-rose-400' : 'border-slate-700 text-slate-400'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="flex-1">{opt.label}</span>
                        </button>
                      );
                    })
                  ) : (
                    q.options.map(opt => {
                      const isSelected = answers.q5?.includes(opt.key);
                      return (
                        <button
                          type="button"
                          key={opt.key}
                          onClick={() => handleToggleMulti(opt.key)}
                          className={`text-left p-2.5 rounded-lg border transition-all flex items-center gap-2.5 cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-rose-950/50 border-rose-500 text-white font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border shrink-0 ${
                            isSelected ? 'bg-rose-600 text-white border-rose-400' : 'border-slate-700 text-slate-400'
                          }`}>
                            {isSelected ? '✓' : opt.key}
                          </span>
                          <span className="flex-1">{opt.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 sticky bottom-0 bg-slate-900/90 py-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-lg uppercase tracking-wider text-xs shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Accusation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
