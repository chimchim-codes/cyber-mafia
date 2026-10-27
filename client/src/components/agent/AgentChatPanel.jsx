import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Bot,
  Sparkles,
  Zap,
  Clock,
  Shield,
  Loader2,
} from 'lucide-react';
import MessageBubble from '../chat/MessageBubble';
import TypingIndicator from '../chat/TypingIndicator';

const CANNED_RESPONSES = [
  'Hello! I am reviewing your account details now. One moment please.',
  'I have checked your order status and it is scheduled to ship today.',
  'I have generated a prepaid return label and emailed it to you.',
  'Your refund of has been initiated and will reflect in 3-5 business days.',
  'Is there anything else I can assist you with today?',
];

export default function AgentChatPanel({
  conversation,
  messages,
  typingState,
  onSendMessage,
  onAccept,
  onResolve,
  onClose,
  onUpdatePriority,
  onOpenTicket,
  currentUser,
}) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingState]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-400">
        <UserCheck className="w-12 h-12 stroke-1 mb-2 opacity-50" />
        <h3 className="text-sm font-semibold text-slate-700">No conversation selected</h3>
        <p className="text-xs text-slate-500">Select a customer from the queue to start assisting.</p>
      </div>
    );
  }

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    onSendMessage(inputText.trim());
    setInputText('');
  };

  const isWaiting = conversation.status === 'Waiting for Agent';
  const isAgentConnected = conversation.status === 'Agent Connected';
  const isResolved = conversation.status === 'Resolved' || conversation.status === 'Closed';

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {conversation.customerName?.[0]?.toUpperCase() || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">{conversation.customerName || 'Customer'}</h3>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isWaiting
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : isAgentConnected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {conversation.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {conversation.customerEmail || 'No email provided'} • Session: {conversation.customerId.slice(0, 12)}
            </p>
          </div>
        </div>

        {/* Priority & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority dropdown */}
          <select
            value={conversation.priority}
            onChange={(e) => onUpdatePriority(conversation._id, e.target.value)}
            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="Low">Priority: Low</option>
            <option value="Medium">Priority: Medium</option>
            <option value="High">Priority: High</option>
            <option value="Urgent">Priority: Urgent</option>
          </select>

          {/* Ticket button */}
          <button
            onClick={onOpenTicket}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="View support ticket"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Ticket</span>
          </button>

          {/* Accept / Resolve / Close actions */}
          {isWaiting && (
            <button
              onClick={() => onAccept(conversation._id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Accept Chat</span>
            </button>
          )}

          {!isResolved && (
            <button
              onClick={() => onResolve(conversation._id)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resolve</span>
            </button>
          )}

          {conversation.status !== 'Closed' && (
            <button
              onClick={() => onClose(conversation._id)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg._id || msg.tempId} message={msg} />
        ))}

        <TypingIndicator typingState={typingState} />
        <div ref={messagesEndRef} />
      </div>

      {/* Canned Response Shortcuts */}
      {!isResolved && (
        <div className="px-3.5 py-1.5 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-600 scrollbar-none">
          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="font-semibold text-slate-500 shrink-0">Quick reply:</span>
          {CANNED_RESPONSES.map((resp, i) => (
            <button
              key={i}
              onClick={() => setInputText(resp)}
              className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 whitespace-nowrap cursor-pointer transition-colors"
            >
              {resp.slice(0, 32)}...
            </button>
          ))}
        </div>
      )}

      {/* Agent Response Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isResolved}
            placeholder={
              isResolved
                ? 'This conversation is resolved or closed.'
                : 'Type response to customer...'
            }
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isResolved}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
