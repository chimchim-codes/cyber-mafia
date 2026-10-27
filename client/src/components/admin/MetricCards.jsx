import React from 'react';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  Bot,
} from 'lucide-react';

function formatDuration(ms) {
  if (!ms || ms === 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m ${remainingSecs}s`;
}

export default function MetricCards({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      title: 'Total Conversations',
      value: metrics.totalConversations ?? 0,
      subtext: 'All-time support threads',
      icon: MessageSquare,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Active Conversations',
      value: metrics.activeConversations ?? 0,
      subtext: 'AI Active & Live Agent',
      icon: Users,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      title: 'Resolved Conversations',
      value: metrics.resolvedConversations ?? 0,
      subtext: 'Successfully closed inquiries',
      icon: CheckCircle2,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Escalated to Agents',
      value: metrics.escalatedConversations ?? 0,
      subtext: 'Currently in agent queue',
      icon: AlertTriangle,
      color: 'amber',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: 'Avg First Response Time',
      value: formatDuration(metrics.avgResponseTimeMs),
      subtext: 'Instant AI response baseline',
      icon: Clock,
      color: 'teal',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
    },
    {
      title: 'Avg Resolution Time',
      value: formatDuration(metrics.avgResolutionTimeMs),
      subtext: 'From start to resolution',
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'AI Resolution Share',
      value: `${metrics.aiResolutionRate ?? 0}%`,
      subtext: `${metrics.aiResolvedCount ?? 0} AI vs ${metrics.humanResolvedCount ?? 0} Human`,
      icon: Bot,
      color: 'sky',
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">{card.title}</span>
              <div className={`w-8 h-8 rounded-xl ${card.bgColor} ${card.textColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{card.value}</div>
            <p className="text-[11px] text-slate-400 mt-1">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
