import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  UserCheck,
  Lock,
  Mail,
  X,
  Sparkles,
  AlertCircle,
  ArrowRight,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  User as UserIcon,
} from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const { login, quickLogin, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('agent');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (onSuccess) onSuccess(res?.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register({ name, email, password, role });
      if (onSuccess) onSuccess(res?.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (roleType) => {
    setError(null);
    setLoading(true);
    try {
      const res = await quickLogin(roleType);
      if (onSuccess) onSuccess(res?.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const prefill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
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
              <p className="text-xs text-slate-500">
                {mode === 'login' ? 'Sign in to access Agent or Admin workspaces' : 'Create a new support staff account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Tabs for Login vs Register */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'login' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'register' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register New Account
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <>
              {/* 1-Click Fast Demo Logins */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Instant 1-Click Demo Sign-In:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
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
                    <span className="text-xs font-semibold mt-1">Sarah C.</span>
                    <span className="text-[10px] text-blue-200">Live Desk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuick('alex')}
                    disabled={loading}
                    className="p-2.5 bg-gradient-to-b from-indigo-700 to-purple-800 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-left shadow-xs cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300">Agent</span>
                    <span className="text-xs font-semibold mt-1">Alex R.</span>
                    <span className="text-[10px] text-indigo-200">Tier 2</span>
                  </button>
                </div>
              </div>

              {/* Pre-seeded Credentials Quick-fill */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <KeyRound className="w-3 h-3 text-blue-600" />
                  <span>Click to autofill seeded credentials:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => prefill('admin@supporthub.com', 'AdminPass123!')}
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-700 hover:text-blue-700 transition-colors cursor-pointer text-[10px] font-medium"
                  >
                    Admin: <span className="font-mono font-bold">admin@supporthub.com</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => prefill('sarah.agent@supporthub.com', 'AgentPass123!')}
                    className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-slate-700 hover:text-blue-700 transition-colors cursor-pointer text-[10px] font-medium"
                  >
                    Agent: <span className="font-mono font-bold">sarah.agent@...</span>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Manual Sign In
                </span>
              </div>

              {/* Manual Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="AdminPass123! or AgentPass123!"
                      className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
            </>
          ) : (
            /* Register New Account Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sharon Sam"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sharon@supporthub.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500 bg-white"
                >
                  <option value="agent">Support Agent (Agent Workspace)</option>
                  <option value="admin">Administrator (Admin Portal & FAQ Manager)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account & Sign In'}</span>
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
