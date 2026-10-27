import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

export default function ChatInput({ onSendMessage, disabled, placeholder = 'Type your message...', isSending }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled || isSending) return;

    onSendMessage(text.trim());
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Auto grow textarea up to max-h-32
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200">
      <div className="flex items-end gap-2 bg-slate-50 border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-2xl p-1.5 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          placeholder={disabled ? 'Conversation closed or connecting...' : placeholder}
          className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden py-1 px-2.5 max-h-28 overflow-y-auto leading-relaxed"
        />

        <button
          type="submit"
          disabled={!text.trim() || disabled || isSending}
          className="shrink-0 w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
          title="Send message (Enter)"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1.5">
        <span className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-blue-500" />
          <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
        </span>
        <span>SupportHub AI</span>
      </div>
    </form>
  );
}
