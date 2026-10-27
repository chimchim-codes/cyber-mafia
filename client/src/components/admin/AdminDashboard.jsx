import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import MetricCards from './MetricCards';
import AnalyticsCharts from './AnalyticsCharts';
import FaqManager from './FaqManager';
import ActivityFeed from './ActivityFeed';
import { BarChart3, RefreshCw, HelpCircle, Layers, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'faqs' | 'activity'
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await api.admin.getMetrics();
      if (res.success && res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // Auto-refresh metrics every 20 seconds
    const interval = setInterval(() => {
      loadMetrics(false);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Support Analytics & Administration
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Live DB Aggregations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time KPIs calculated dynamically from MongoDB collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview & Charts
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'faqs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FAQ Knowledge Base
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'activity' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activity Feed
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => loadMetrics(false)}
            disabled={isRefreshing}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 cursor-pointer shadow-2xs transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-xs font-medium">Aggregating database statistics...</p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards (Always visible) */}
          <MetricCards metrics={metrics} />

          {/* Tab 1: Overview & Charts */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <AnalyticsCharts metrics={metrics} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityFeed activity={metrics?.recentActivity || []} />
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Top Frequently Resolved Queries</span>
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {metrics?.topFAQs?.map((faq) => (
                      <div key={faq._id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="truncate pr-3">
                          <p className="font-semibold text-slate-800 truncate">{faq.question}</p>
                          <span className="text-[10px] text-blue-600 font-medium">{faq.category}</span>
                        </div>
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold shrink-0">
                          {faq.usageCount || 0} hits
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: FAQ Knowledge Base */}
          {activeTab === 'faqs' && <FaqManager />}

          {/* Tab 3: Activity Feed */}
          {activeTab === 'activity' && (
            <div className="max-w-4xl mx-auto">
              <ActivityFeed activity={metrics?.recentActivity || []} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
