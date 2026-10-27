import React from 'react';
import { Activity, Bot, User, UserCheck, Clock, ArrowRight } from 'lucide-react';

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ActivityFeed({ activity = [] }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900">Recent Support Activity</h3>
        </div>
        <span className="text-xs text-slate-400">Live event stream</span>
      </div>

      <div className="divide-y divide-slate-100">
        {activity.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No recent activity logged.</div>
        ) : (
          activity.map((item) => {
            const isCustomer = item.senderType === 'customer';
            const isAI = item.senderType === 'ai';
            const isAgent = item.senderType === 'agent';

            return (
              <div key={item._id} className="py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors px-1 rounded-lg">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${
                    isCustomer
                      ? 'bg-slate-700'
                      : isAI
                      ? 'bg-blue-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {isCustomer ? <User className="w-3.5 h-3.5" /> : isAI ? <Bot className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {item.senderName || (isCustomer ? 'Customer' : isAI ? 'SupportHub AI' : 'Agent')}
                      <span className="font-normal text-slate-400 ml-1.5">
                        (Thread with {item.customerName || 'Guest'})
                      </span>
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimestamp(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                    {item.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
