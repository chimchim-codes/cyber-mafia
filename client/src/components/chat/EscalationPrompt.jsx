import React from 'react';
import { UserCheck, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function EscalationPrompt({ onEscalate, onDecline, ticket, disabled }) {
  if (ticket) {
    return (
      <div className="my-2 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-emerald-900 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold">Support Ticket Generated</span>
          <span className="text-[11px] font-mono bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-800 ml-auto">
            {ticket.ticketNumber || '#TICK-ACTIVE'}
          </span>
        </div>
        <p className="text-xs text-emerald-800 mb-1">
          A live support specialist has been assigned to your ticket and will join this chat thread shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="my-2.5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
          <ShieldAlert className="w-3.5 h-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-amber-950">Connect with a Live Support Agent?</h4>
          <p className="text-[11px] text-amber-800">Our customer care team can access your account details directly.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2.5">
        <button
          onClick={onEscalate}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Connect to Agent</span>
        </button>
        <button
          onClick={onDecline}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
        >
          <span>Continue with AI</span>
        </button>
      </div>
    </div>
  );
}
