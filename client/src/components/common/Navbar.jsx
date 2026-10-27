import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  ShoppingBag,
  Headphones,
  BarChart3,
  User,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenLogin }) {
  const { user, isAuthenticated, isAdmin, isAgent, logout } = useAuth();

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

        {/* View Switcher Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setCurrentView('store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'store'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Customer Storefront</span>
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) onOpenLogin();
              else setCurrentView('agent');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'agent'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Agent Workspace</span>
            {isAgent && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated || !isAdmin) onOpenLogin();
              else setCurrentView('admin');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
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
            onClick={() => {
              if (!isAuthenticated) onOpenLogin();
              else setCurrentView('agent');
            }}
            className={`p-2 rounded-lg ${currentView === 'agent' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
            title="Agent Workspace"
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (!isAuthenticated || !isAdmin) onOpenLogin();
              else setCurrentView('admin');
            }}
            className={`p-2 rounded-lg ${currentView === 'admin' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
            title="Admin Portal"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-semibold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Staff Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
