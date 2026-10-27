import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, UserCheck, Lock, Mail, X, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (roleType) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(roleType);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Support Staff Portal</h3>
              <p className="text-xs text-slate-500">Sign in to access Agent or Admin workspaces</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 1-Click Fast Demo Logins */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Reviewer 1-Click Sign-in:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuick('admin')}
                disabled={loading}
                className="p-2.5 bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl text-left shadow-xs cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">Admin</span>
                <span className="text-xs font-semibold mt-1">Jordan H.</span>
                <span className="text-[10px] text-slate-300">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('sarah')}
                disabled={loading}
                className="p-2.5 bg-gradient-to-b from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-left shadow-xs cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Agent</span>
                <span className="text-xs font-semibold mt-1">Sarah Connor</span>
                <span className="text-[10px] text-blue-200">Live Support</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('alex')}
                disabled={loading}
                className="p-2.5 bg-gradient-to-b from-indigo-700 to-purple-800 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-left shadow-xs cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300">Agent</span>
                <span className="text-xs font-semibold mt-1">Alex Rivera</span>
                <span className="text-[10px] text-indigo-200">Tier 2 Support</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              Or Custom Login
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Manual Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@supporthub.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
