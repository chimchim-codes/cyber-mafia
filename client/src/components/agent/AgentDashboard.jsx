import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/client';
import ConversationQueue from './ConversationQueue';
import AgentChatPanel from './AgentChatPanel';
import TicketDrawer from './TicketDrawer';
import { ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function AgentDashboard() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingState, setTypingState] = useState({ isTyping: false, name: '', sender: '' });
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTicketDrawerOpen, setIsTicketDrawerOpen] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState(null);

  // Fetch initial conversations list
  const fetchConversations = async () => {
    try {
      const res = await api.conversations.list({
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery,
      });
      if (res.success && res.conversations) {
        setConversations(res.conversations);
        if (!selectedId && res.conversations.length > 0) {
          setSelectedId(res.conversations[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, priorityFilter, searchQuery]);

  // Load selected conversation details and messages
  useEffect(() => {
    if (!selectedId) {
      setSelectedConv(null);
      setMessages([]);
      return;
    }

    async function loadSelected() {
      try {
        const res = await api.conversations.get(selectedId);
        if (res.success) {
          setSelectedConv(res.conversation);
          setMessages(res.messages || []);
        }
      } catch (err) {
        console.error('Failed to load selected conversation:', err);
      }
    }

    loadSelected();

    // Join conversation room in socket
    if (socket && isConnected) {
      socket.emit('join_conversation', {
        conversationId: selectedId,
        user,
        role: 'agent',
      });
    }
  }, [selectedId, socket, isConnected]);

  // Socket.IO synchronization for Agent Desk
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join agent desk room for notifications
    socket.emit('join_agent_desk', { user });

    const handleNewEscalation = ({ conversation: newEsc, ticket }) => {
      setNotificationBanner({
        message: `🚨 New customer escalation: ${newEsc.customerName || 'Customer'} is waiting for an agent!`,
        conversationId: newEsc._id,
      });

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === newEsc._id);
        if (exists) {
          return prev.map((c) => (c._id === newEsc._id ? newEsc : c));
        }
        return [newEsc, ...prev];
      });
    };

    const handleConversationUpdated = ({ conversation: updated }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
      );

      if (selectedId === updated._id) {
        setSelectedConv((prev) => ({ ...prev, ...updated }));
      }
    };

    const handleMessageReceived = ({ message }) => {
      if (message.conversationId === selectedId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }

      // Update last message in queue
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === message.conversationId) {
            return {
              ...c,
              lastMessage: {
                content: message.content,
                senderType: message.senderType,
                createdAt: message.createdAt,
              },
            };
          }
          return c;
        })
      );
    };

    const handlePartnerTyping = ({ isTyping, name, sender }) => {
      setTypingState({ isTyping, name, sender });
    };

    socket.on('new_escalation', handleNewEscalation);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('message_received', handleMessageReceived);
    socket.on('partner_typing', handlePartnerTyping);

    return () => {
      socket.off('new_escalation', handleNewEscalation);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('message_received', handleMessageReceived);
      socket.off('partner_typing', handlePartnerTyping);
    };
  }, [socket, isConnected, selectedId, user]);

  // Actions
  const handleSendMessage = (text) => {
    if (!selectedId || !text.trim()) return;

    if (socket && isConnected) {
      socket.emit('agent_message', {
        conversationId: selectedId,
        content: text,
        agentId: user?._id,
        agentName: user?.name,
      });
    } else {
      api.messages.send(selectedId, {
        content: text,
        senderType: 'agent',
        senderId: user?._id,
        senderName: user?.name,
      }).then((res) => {
        if (res.success && res.message) {
          setMessages((prev) => [...prev, res.message]);
        }
      });
    }
  };

  const handleAccept = async (id) => {
    if (socket && isConnected) {
      socket.emit('accept_conversation', {
        conversationId: id,
        agentId: user?._id,
        agentName: user?.name,
      });
    } else {
      await api.conversations.assign(id, user?._id);
      fetchConversations();
    }
  };

  const handleResolve = async (id) => {
    if (socket && isConnected) {
      socket.emit('resolve_conversation', {
        conversationId: id,
        resolvedBy: 'Agent',
        role: 'agent',
      });
    } else {
      await api.conversations.updateStatus(id, 'Resolved', 'Agent');
      fetchConversations();
    }
  };

  const handleClose = async (id) => {
    await api.conversations.updateStatus(id, 'Closed', 'Agent');
    fetchConversations();
  };

  const handleUpdatePriority = async (id, priority) => {
    await api.conversations.updatePriority(id, priority);
    setConversations((prev) =>
      prev.map((c) => (c._id === id ? { ...c, priority } : c))
    );
    if (selectedConv) setSelectedConv({ ...selectedConv, priority });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 overflow-hidden">
      {/* Escalation Real-time Notification Banner */}
      {notificationBanner && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md shrink-0 animate-slide-up">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping shrink-0" />
            <span>{notificationBanner.message}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedId(notificationBanner.conversationId);
                setNotificationBanner(null);
              }}
              className="bg-white text-amber-900 px-2.5 py-0.5 rounded font-bold hover:bg-amber-50 cursor-pointer shadow-xs"
            >
              Open Chat
            </button>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-white hover:text-amber-200 cursor-pointer font-bold ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace: Left Queue + Right Chat Panel */}
      <div className="flex-1 flex overflow-hidden">
        <ConversationQueue
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <AgentChatPanel
          conversation={selectedConv}
          messages={messages}
          typingState={typingState}
          onSendMessage={handleSendMessage}
          onAccept={handleAccept}
          onResolve={handleResolve}
          onClose={handleClose}
          onUpdatePriority={handleUpdatePriority}
          onOpenTicket={() => setIsTicketDrawerOpen(true)}
          currentUser={user}
        />
      </div>

      {/* Ticket Drawer */}
      <TicketDrawer
        isOpen={isTicketDrawerOpen}
        onClose={() => setIsTicketDrawerOpen(false)}
        conversation={selectedConv}
        onTicketUpdated={() => fetchConversations()}
      />
    </div>
  );
}
