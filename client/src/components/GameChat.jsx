// client/src/components/GameChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Radio, Lock, Pin, ChevronUp, ChevronDown } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export default function GameChat({
  messages,
  myTeam,
  onSendMessage,
  visibleEvidence
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState('PUBLIC');
  const [textInput, setTextInput] = useState('');
  const [selectedEvidenceToAttach, setSelectedEvidenceToAttach] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!textInput.trim() && !selectedEvidenceToAttach) return;
    playClick();
    onSendMessage(channel, textInput.trim(), selectedEvidenceToAttach || null);
    setTextInput('');
    setSelectedEvidenceToAttach('');
  };

  const filteredMessages = (messages || []).filter(msg => {
    if (channel === 'PUBLIC') return true;
    if (channel === 'TEAM') return msg.senderTeamId === myTeam?.id;
    return true;
  });

  return (
    <div className="fixed bottom-0 right-4 z-40 max-w-sm w-full font-mono">
      {/* Header Bar Toggle */}
      <button
        onClick={() => { playClick(); setIsOpen(!isOpen); }}
        className="w-full bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-2xl text-xs text-slate-200 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="font-bold">TACTICAL COMMS ({filteredMessages.length})</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Expanded Comms Drawer */}
      {isOpen && (
        <div className="bg-slate-950 border-x border-b border-slate-700 p-3 space-y-3 shadow-2xl rounded-b-xl max-h-96 flex flex-col">
          {/* Channel Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg text-xs">
            <button
              onClick={() => { playClick(); setChannel('PUBLIC'); }}
              className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                channel === 'PUBLIC' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3 inline mr-1" /> Public Net
            </button>
            <button
              onClick={() => { playClick(); setChannel('TEAM'); }}
              className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                channel === 'TEAM' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3 inline mr-1" /> Squad Secure
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1 max-h-52">
            {filteredMessages.length === 0 ? (
              <div className="text-slate-500 text-center py-6 text-[11px]">
                No transmissions on this frequency yet.
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div key={msg.id} className="p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-cyan-400">{msg.senderTeamId} ({msg.senderTeamName})</span>
                    <span className="text-slate-500">{msg.timestamp}</span>
                  </div>
                  <div className="text-slate-200 text-[11px] break-words">{msg.text}</div>
                  {msg.evidenceAttachment && (
                    <div className="p-1.5 bg-black/60 rounded border border-cyan-900 text-[10px] text-cyan-300">
                      📎 Attached Evidence: {msg.evidenceAttachment}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSend} className="space-y-2 pt-1 border-t border-slate-900">
            {visibleEvidence?.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Pin className="w-3 h-3 text-rose-400" />
                <select
                  value={selectedEvidenceToAttach}
                  onChange={(e) => setSelectedEvidenceToAttach(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[10px]"
                >
                  <option value="">No Evidence Attached</option>
                  {visibleEvidence.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.id} - {ev.attackSignature}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-1.5">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={channel === 'PUBLIC' ? 'Transmit public message...' : 'Encrypted squad message...'}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg cursor-pointer flex items-center justify-center shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
