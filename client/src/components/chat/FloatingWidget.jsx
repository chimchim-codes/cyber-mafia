import React, { useState } from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function FloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setHasInteracted(true);
    } else if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Chat Window */}
      <ChatWindow
        isOpen={isOpen}
        isMinimized={isMinimized}
        onClose={() => setIsOpen(false)}
        onMinimize={() => setIsMinimized(!isMinimized)}
      />

      {/* Launcher Button (visible when closed or minimized) */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3">
          {/* Friendly bubble tooltip if user hasn't clicked yet */}
          {!hasInteracted && (
            <div className="hidden sm:flex items-center gap-2 bg-white text-slate-800 text-xs font-medium py-2 px-3.5 rounded-full shadow-lg border border-slate-200/90 animate-bounce cursor-pointer"
                 onClick={handleToggle}>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Need help? Chat with AI Assistant</span>
            </div>
          )}

          <button
            onClick={handleToggle}
            aria-label="Open Customer Support Chat"
            className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-blue-300"
          >
            {/* Glowing ring */}
            <span className="absolute -inset-1 rounded-full bg-blue-500/30 blur-xs group-hover:bg-blue-500/50 transition-all pointer-events-none" />

            <div className="relative flex items-center justify-center">
              <MessageSquare className="w-6 h-6 group-hover:rotate-6 transition-transform" />
            </div>

            {/* Online Indicator Badge */}
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
          </button>
        </div>
      )}
    </>
  );
}
