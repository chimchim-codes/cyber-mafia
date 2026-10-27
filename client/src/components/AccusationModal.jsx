// client/src/components/AccusationModal.jsx
import React, { useState } from 'react';
import { ShieldAlert, X, Send, CheckCircle2 } from 'lucide-react';
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
  onSubmitAccusation
}) {
  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: []
  });
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answers.q1 || !answers.q2 || !answers.q3 || !answers.q4) {
      setErrorMsg('Please answer Questions 1 through 4.');
      return;
    }
    if (!answers.q5 || answers.q5.length === 0) {
      setErrorMsg('Please select supporting evidence in Question 5.');
      return;
    }

    playAlarm();
    onSubmitAccusation(answers);
    onClose();
  };

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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
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
      </div>
    </div>
  );
}
