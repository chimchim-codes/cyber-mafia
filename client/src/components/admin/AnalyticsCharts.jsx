import React from 'react';
import { Bot, UserCheck, PieChart, BarChart2, Layers } from 'lucide-react';

export default function AnalyticsCharts({ metrics }) {
  if (!metrics) return null;

  const { statusBreakdown = {}, priorityBreakdown = {}, aiResolvedCount = 0, humanResolvedCount = 0 } = metrics;

  const totalResolved = (aiResolvedCount + humanResolvedCount) || 1;
  const aiPercent = Math.round((aiResolvedCount / totalResolved) * 100);
  const humanPercent = 100 - aiPercent;

  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
  const totalPriority = Object.values(priorityBreakdown).reduce((a, b) => a + b, 0) || 1;

  const statusColors = {
    'AI Active': 'bg-indigo-500',
    'Waiting for Agent': 'bg-amber-500',
    'Agent Connected': 'bg-emerald-500',
    Resolved: 'bg-blue-600',
    Closed: 'bg-slate-400',
  };

  const priorityColors = {
    Urgent: 'bg-rose-500',
    High: 'bg-orange-500',
    Medium: 'bg-blue-500',
    Low: 'bg-slate-400',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. AI vs Human Resolution Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">Resolution Comparison</h3>
          </div>
          <span className="text-xs text-slate-400">AI vs Human Agent</span>
        </div>

        {/* Stacked comparison bar */}
        <div className="space-y-3">
          <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${aiPercent}%` }}
              className="bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center transition-all duration-500"
              title={`AI Resolved: ${aiPercent}%`}
            >
              {aiPercent > 15 ? `${aiPercent}% AI` : ''}
            </div>
            <div
              style={{ width: `${humanPercent}%` }}
              className="bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center transition-all duration-500"
              title={`Human Resolved: ${humanPercent}%`}
            >
              {humanPercent > 15 ? `${humanPercent}% Human` : ''}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">AI Resolved</p>
                <p className="text-base font-bold text-slate-900">{aiResolvedCount} inquiries</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Agent Resolved</p>
                <p className="text-base font-bold text-slate-900">{humanResolvedCount} inquiries</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Status Distribution */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">Status Distribution</h3>
          </div>
          <span className="text-xs text-slate-400">Active Pipeline</span>
        </div>

        <div className="space-y-2.5">
          {Object.entries(statusBreakdown).map(([status, count]) => {
            const pct = Math.round((count / totalStatus) * 100);
            return (
              <div key={status} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{status}</span>
                  <span className="text-slate-500 font-mono">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${statusColors[status] || 'bg-slate-400'} rounded-full transition-all duration-500`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Priority Levels Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-800">Priority Breakdown</h3>
          </div>
          <span className="text-xs text-slate-400">Severity Levels</span>
        </div>

        <div className="space-y-2.5">
          {['Urgent', 'High', 'Medium', 'Low'].map((prio) => {
            const count = priorityBreakdown[prio] || 0;
            const pct = Math.round((count / totalPriority) * 100);
            return (
              <div key={prio} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{prio} Priority</span>
                  <span className="text-slate-500 font-mono">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${priorityColors[prio] || 'bg-slate-400'} rounded-full transition-all duration-500`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
