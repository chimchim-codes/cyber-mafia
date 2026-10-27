import React from 'react';
import { Bot, UserCheck } from 'lucide-react';

export default function TypingIndicator({ typingState }) {
  if (!typingState || !typingState.isTyping) return null;

  const isAI = typingState.sender === 'ai';
  const name = typingState.name || (isAI ? 'SupportHub AI' : 'Agent');

  return (
    <div className="flex items-start gap-2.5 my-2 animate-fade-in">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
        isAI ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-emerald-600 text-white'
      }`}>
        {isAI ? <Bot className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-slate-500">{name}</span>
          <span className="text-[10px] text-slate-400">is typing</span>
        </div>
        <div className="flex items-center gap-1 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot-3" />
        </div>
      </div>
    </div>
  );
}
