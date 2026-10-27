import React from 'react';
import { Bot, User, UserCheck, ShieldAlert, Sparkles, CheckCheck } from 'lucide-react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
  const { senderType, senderName, content, createdAt, messageType, meta } = message;

  // System notification
  if (senderType === 'system' || messageType === 'system') {
    return (
      <div className="flex justify-center my-2.5 px-2">
        <span className="text-[11px] font-medium bg-slate-100/90 text-slate-600 px-3 py-1 rounded-full border border-slate-200/70 text-center shadow-2xs">
          {content}
        </span>
      </div>
    );
  }

  const isCustomer = senderType === 'customer';
  const isAI = senderType === 'ai';
  const isAgent = senderType === 'agent';

  return (
    <div className={`flex items-start gap-2.5 my-2.5 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white shadow-2xs ${
          isCustomer
            ? 'bg-gradient-to-tr from-slate-600 to-slate-800'
            : isAI
            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
            : 'bg-gradient-to-tr from-emerald-600 to-teal-600'
        }`}
      >
        {isCustomer ? (
          <User className="w-3.5 h-3.5" />
        ) : isAI ? (
          <Bot className="w-4 h-4" />
        ) : (
          <UserCheck className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Bubble container */}
      <div className={`flex flex-col max-w-[82%] sm:max-w-[76%] ${isCustomer ? 'items-end' : 'items-start'}`}>
        {/* Sender Label & Badge */}
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <span className="text-[11px] font-semibold text-slate-700">
            {senderName || (isCustomer ? 'You' : isAI ? 'SupportHub AI' : 'Support Specialist')}
          </span>
          {isAI && (
            <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono">
              AI
            </span>
          )}
          {isAgent && (
            <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-mono">
              Agent
            </span>
          )}
          <span className="text-[10px] text-slate-400">{formatTime(createdAt)}</span>
        </div>

        {/* Message Content Bubble */}
        <div
          className={`text-xs sm:text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl shadow-xs whitespace-pre-wrap break-words ${
            isCustomer
              ? 'bg-blue-600 text-white rounded-tr-xs'
              : isAgent
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 rounded-tl-xs'
              : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
          }`}
        >
          {content}
        </div>

        {/* Delivery checkmark for customer */}
        {isCustomer && (
          <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-slate-400">
            <CheckCheck className="w-3 h-3 text-blue-500" />
            <span>Delivered</span>
          </div>
        )}
      </div>
    </div>
  );
}
