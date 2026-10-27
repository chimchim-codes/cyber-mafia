import React from 'react';
import { Search, Filter, Clock, User, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationQueue({
  conversations,
  selectedId,
  onSelect,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  searchQuery,
  setSearchQuery,
}) {
  const STATUSES = ['All', 'Waiting for Agent', 'Agent Connected', 'AI Active', 'Resolved'];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full md:w-80 lg:w-96 shrink-0">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Support Queue</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {conversations.length}
            </span>
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, email, text..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-xs font-medium">No conversations found matching filters.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = selectedId === conv._id;
            const isWaiting = conv.status === 'Waiting for Agent';
            const isAgent = conv.status === 'Agent Connected';
            const isAI = conv.status === 'AI Active';
            const isResolved = conv.status === 'Resolved';

            return (
              <div
                key={conv._id}
                onClick={() => onSelect(conv._id)}
                className={`p-3.5 cursor-pointer transition-all hover:bg-slate-50 relative ${
                  isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        isWaiting
                          ? 'bg-amber-500'
                          : isAgent
                          ? 'bg-emerald-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      {conv.customerName?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {conv.customerName || 'Guest Customer'}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {conv.customerEmail || conv.customerId}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimestamp(conv.lastMessage?.createdAt || conv.updatedAt)}
                  </span>
                </div>

                {/* Message preview */}
                <p className="text-xs text-slate-600 line-clamp-1 mb-2">
                  {conv.lastMessage?.content || 'Conversation started...'}
                </p>

                {/* Badges */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        isWaiting
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : isAgent
                          ? 'bg-emerald-100 text-emerald-800'
                          : isAI
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {conv.status}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`px-1.5 py-0.2 rounded font-medium ${
                        conv.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-700 font-bold'
                          : conv.priority === 'High'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {conv.priority}
                    </span>
                  </div>

                  {/* Unread indicator */}
                  {conv.unreadCountAgent > 0 && (
                    <span className="bg-blue-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                      {conv.unreadCountAgent}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
