import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  UserCheck,
  Bot,
  Wifi,
  WifiOff,
  AlertTriangle,
  Mail,
  Send,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import QuickQuestions from './QuickQuestions';
import EscalationPrompt from './EscalationPrompt';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

export default function ChatWindow({ isOpen, onClose, onMinimize, isMinimized }) {
  const { socket, isConnected, isReconnecting, onlineAgentsCount } = useSocket();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingState, setTypingState] = useState({ isTyping: false, name: '', sender: '' });
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineForm, setOfflineForm] = useState({ email: '', message: '' });
  const [offlineSubmitted, setOfflineSubmitted] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingState]);

  // Initialize or resume conversation session
  useEffect(() => {
    let customerId = localStorage.getItem('supporthub_customer_id');
    if (!customerId) {
      customerId = 'cust_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('supporthub_customer_id', customerId);
    }

    async function initChat() {
      try {
        const res = await api.conversations.init({
          customerId,
          customerName: localStorage.getItem('supporthub_customer_name') || 'Customer',
        });

        if (res.success && res.conversation) {
          setConversation(res.conversation);

          // Fetch message history
          const histRes = await api.messages.list(res.conversation._id);
          if (histRes.success) {
            setMessages(histRes.messages || []);
          }
        }
      } catch (err) {
        console.error('Failed to init chat session:', err);
        setErrorMessage('Unable to connect to support service. Please refresh or retry.');
      }
    }

    initChat();
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    // Join conversation room
    socket.emit('join_conversation', {
      conversationId: conversation._id,
      role: 'customer',
    });

    const handleMessageReceived = ({ message, tempId }) => {
      setMessages((prev) => {
        // If message already exists by ID or tempId, skip
        if (prev.some((m) => m._id === message._id || (tempId && m.tempId === tempId))) {
          return prev;
        }
        return [...prev, message];
      });
      setIsSending(false);
      setErrorMessage(null);
    };

    const handlePartnerTyping = ({ isTyping, name, sender }) => {
      setTypingState({ isTyping, name, sender });
    };

    const handleConversationUpdated = ({ conversation: updated }) => {
      if (updated && updated._id === conversation._id) {
        setConversation(updated);
      }
    };

    const handleError = ({ message }) => {
      setErrorMessage(message || 'An error occurred.');
      setIsSending(false);
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('partner_typing', handlePartnerTyping);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('error_message', handleError);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('partner_typing', handlePartnerTyping);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('error_message', handleError);
    };
  }, [socket, conversation?._id]);

  // Send message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !conversation?._id) return;

    setErrorMessage(null);
    setIsSending(true);

    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      tempId,
      conversationId: conversation._id,
      senderType: 'customer',
      senderName: conversation.customerName || 'Customer',
      content: text,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sent',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Send via Socket if connected, else fallback to REST
    if (socket && isConnected) {
      socket.emit('customer_message', {
        conversationId: conversation._id,
        content: text,
        tempId,
        customerName: conversation.customerName,
      });
    } else {
      try {
        const res = await api.messages.send(conversation._id, {
          content: text,
          senderType: 'customer',
        });

        if (res.success) {
          // Replace optimistic with real
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.tempId !== tempId);
            const additions = [res.message];
            if (res.aiMessage) additions.push(res.aiMessage);
            return [...filtered, ...additions];
          });
          if (res.conversation) setConversation(res.conversation);
        }
      } catch (err) {
        setErrorMessage('Message delivery failed. Please check your connection.');
      } finally {
        setIsSending(false);
      }
    }
  };

  // Request escalation to live human agent
  const handleRequestEscalation = () => {
    if (!conversation?._id) return;
    setShowMenu(false);

    if (socket && isConnected) {
      socket.emit('request_escalation', {
        conversationId: conversation._id,
        reason: 'Customer requested human agent via menu',
      });
    } else {
      api.conversations.updateStatus(conversation._id, 'Waiting for Agent');
    }
  };

  // Clear chat / Start new conversation
  const handleClearChat = async () => {
    if (!conversation?._id) return;
    setShowMenu(false);
    if (!window.confirm('Are you sure you want to clear this conversation and start a new session?')) return;

    try {
      await api.conversations.clear(conversation._id);
      localStorage.removeItem('supporthub_customer_id');

      // Re-init
      const newCustId = 'cust_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('supporthub_customer_id', newCustId);

      const res = await api.conversations.init({ customerId: newCustId });
      if (res.success && res.conversation) {
        setConversation(res.conversation);
        const histRes = await api.messages.list(res.conversation._id);
        setMessages(histRes.messages || []);
      }
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  };

  // Offline message submission
  const handleOfflineSubmit = (e) => {
    e.preventDefault();
    if (!offlineForm.email || !offlineForm.message || !conversation?._id) return;

    if (socket && isConnected) {
      socket.emit('leave_offline_message', {
        conversationId: conversation._id,
        email: offlineForm.email,
        message: offlineForm.message,
        name: conversation.customerName,
      });
    } else {
      api.tickets.create({
        conversationId: conversation._id,
        customerEmail: offlineForm.email,
        customerName: conversation.customerName,
        subject: 'Offline Support Message',
        description: offlineForm.message,
      });
    }

    setOfflineSubmitted(true);
    setTimeout(() => {
      setShowOfflineModal(false);
      setOfflineSubmitted(false);
      setOfflineForm({ email: '', message: '' });
    }, 2200);
  };

  if (!isOpen) return null;

  const status = conversation?.status || 'AI Active';
  const isAgentConnected = status === 'Agent Connected';
  const isWaitingForAgent = status === 'Waiting for Agent';
  const isResolved = status === 'Resolved' || status === 'Closed';

  // Find if latest message suggests escalation
  const lastMessage = messages[messages.length - 1];
  const showEscalationPrompt =
    lastMessage?.meta?.promptEscalation &&
    status === 'AI Active' &&
    lastMessage.senderType === 'ai';

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-white border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden ${
        isMinimized
          ? 'bottom-24 right-5 w-72 h-14'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[85vh]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3.5 flex items-center justify-between select-none shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-inner">
              {isAgentConnected ? <UserCheck className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            {/* Status dot */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-indigo-700 ${
                !isConnected
                  ? 'bg-rose-500'
                  : isReconnecting
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
              title={!isConnected ? 'Offline' : isReconnecting ? 'Reconnecting' : 'Connected'}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm leading-tight">
                {isAgentConnected
                  ? conversation?.assignedAgentId?.name || 'Support Agent'
                  : 'SupportHub AI'}
              </h3>
              <span className="text-[10px] font-medium bg-white/20 text-white px-1.5 py-0.2 rounded-full backdrop-blur-xs">
                {status}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-100">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-300" />
                  <span>Real-time connected</span>
                </>
              ) : isReconnecting ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-300" />
                  <span>Reconnecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-300" />
                  <span>Offline mode</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Options"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs">
                <button
                  onClick={handleRequestEscalation}
                  disabled={isAgentConnected || isWaitingForAgent}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Connect to Live Agent</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowOfflineModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Leave Offline Message</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleClearChat}
                  className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start New Conversation</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onMinimize}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Status banner when waiting for agent */}
          {isWaitingForAgent && (
            <div className="bg-amber-500/10 border-b border-amber-200 px-3.5 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Waiting for next available agent...</span>
              </div>
              <button
                onClick={() => setShowOfflineModal(true)}
                className="text-[11px] underline font-medium hover:text-amber-950 cursor-pointer"
              >
                Leave a note
              </button>
            </div>
          )}

          {/* Status banner when agent is connected */}
          {isAgentConnected && (
            <div className="bg-emerald-500/10 border-b border-emerald-200 px-3.5 py-1.5 flex items-center gap-1.5 text-xs text-emerald-900 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium">
                Live Support Connected with {conversation?.assignedAgentId?.name || 'an Agent'}
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border-b border-rose-200 px-3 py-1.5 flex items-center justify-between text-xs text-rose-700 shrink-0">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto bg-slate-50/50 space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg._id || msg.tempId} message={msg} />
            ))}

            {/* Suggested quick questions (when only initial AI welcome message exists) */}
            {messages.length <= 1 && (
              <QuickQuestions onSelect={handleSendMessage} disabled={isSending} />
            )}

            {/* Interactive escalation card */}
            {showEscalationPrompt && (
              <EscalationPrompt
                onEscalate={handleRequestEscalation}
                onDecline={() => handleSendMessage('No thanks, I will continue chatting with the AI.')}
                disabled={isSending}
              />
            )}

            {/* Typing indicator */}
            <TypingIndicator typingState={typingState} />

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isResolved}
            isSending={isSending}
            placeholder={
              isAgentConnected
                ? 'Reply to support agent...'
                : isWaitingForAgent
                ? 'Add notes while waiting for agent...'
                : 'Ask SupportHub AI a question...'
            }
          />

          {/* Offline modal */}
          {showOfflineModal && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-2xl border border-slate-200 text-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Leave an Offline Message</span>
                  </h4>
                  <button
                    onClick={() => setShowOfflineModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
                  >
                    ×
                  </button>
                </div>

                {offlineSubmitted ? (
                  <div className="py-6 text-center text-xs text-emerald-700 font-medium space-y-1">
                    <p className="text-sm font-bold">Message Logged! ✅</p>
                    <p>We will email you as soon as our support team reviews your ticket.</p>
                  </div>
                ) : (
                  <form onSubmit={handleOfflineSubmit} className="space-y-2.5 text-xs">
                    <p className="text-slate-500">
                      Our live agents are currently busy or offline. Leave your email and inquiry to create a priority ticket.
                    </p>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Your Email</label>
                      <input
                        type="email"
                        required
                        value={offlineForm.email}
                        onChange={(e) => setOfflineForm({ ...offlineForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Inquiry / Details</label>
                      <textarea
                        required
                        rows={3}
                        value={offlineForm.message}
                        onChange={(e) => setOfflineForm({ ...offlineForm, message: e.target.value })}
                        placeholder="Please describe how we can assist..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowOfflineModal(false)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-xs cursor-pointer"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
