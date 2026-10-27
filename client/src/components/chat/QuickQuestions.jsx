import React from 'react';
import { HelpCircle, Package, KeyRound, CreditCard, UserCheck } from 'lucide-react';

const DEFAULT_QUESTIONS = [
  { text: 'Where is my order?', icon: Package },
  { text: 'How do I reset my password?', icon: KeyRound },
  { text: 'I need help with a payment.', icon: CreditCard },
  { text: 'I want to speak to a human agent.', icon: UserCheck },
];

export default function QuickQuestions({ onSelect, disabled }) {
  return (
    <div className="py-2 px-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2 px-1">
        <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
        <span>Suggested questions:</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {DEFAULT_QUESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(item.text)}
              disabled={disabled}
              className="group flex items-center justify-between text-left text-xs sm:text-sm font-medium px-3 py-2 rounded-xl bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 transition-all duration-150 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                <span>{item.text}</span>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
