import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  ShoppingBag,
  Headphones,
  BarChart3,
  User,
  Shield,
  Sparkles,
} from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenLogin }) {
  const { user, switchRole } = useAuth();

  const handleSelectRole = (role) => {
    switchRole(role);
    if (role === 'admin') setCurrentView('admin');
    else if (role === 'agent') setCurrentView('agent');
    else setCurrentView('store');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Brand */}
      <div className="flex items-center gap-6">
        <div
          onClick={() => setCurrentView('store')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">SupportHub</span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                AI + Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Customer Care & Live Escalation</p>
          </div>
        </div>

        {/* View Switcher Tabs (Seamless 1-Click Navigation, No Password) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              setCurrentView('store');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'store'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Customer Storefront</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('agent');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'agent'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Agent Workspace</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={() => {
              setCurrentView('admin');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>
        </nav>
      </div>

      {/* Right Controls: Quick 1-Click Persona Switcher */}
      <div className="flex items-center gap-2">
        {/* Mobile View Selector */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => setCurrentView('store')}
            className={`p-2 rounded-lg ${currentView === 'store' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
            title="Storefront"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentView('agent')}
            className={`p-2 rounded-lg ${currentView === 'agent' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
            title="Agent Workspace"
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentView('admin')}
            className={`p-2 rounded-lg ${currentView === 'admin' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
            title="Admin Portal"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Role Switcher Pill */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider px-2 font-bold hidden lg:inline">
            Role:
          </span>
          <button
            type="button"
            onClick={() => handleSelectRole('customer')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
              currentView === 'store'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => handleSelectRole('agent')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
              currentView === 'agent'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Agent
          </button>
          <button
            type="button"
            onClick={() => handleSelectRole('admin')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
              currentView === 'admin'
                ? 'bg-slate-900 text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
        </div>
      </div>
    </header>
  );
}
