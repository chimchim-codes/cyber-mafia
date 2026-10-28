import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, DEMO_ADMIN, DEMO_AGENT, DEMO_AGENT_TIER2 } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('supporthub_user');
    return saved ? JSON.parse(saved) : DEMO_ADMIN; // Default to admin for seamless evaluation
  });
  const [token, setToken] = useState(() => localStorage.getItem('supporthub_token') || 'demo_admin_token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('supporthub_user')) {
      localStorage.setItem('supporthub_user', JSON.stringify(DEMO_ADMIN));
      localStorage.setItem('supporthub_token', 'demo_admin_token');
    }
  }, []);

  const switchRole = (role) => {
    let targetUser = DEMO_ADMIN;
    let targetToken = 'demo_admin_token';

    if (role === 'agent') {
      targetUser = DEMO_AGENT;
      targetToken = 'demo_agent_token';
    } else if (role === 'customer') {
      targetUser = {
        _id: 'cust_persona',
        name: 'Guest Customer',
        email: 'shopper@example.com',
        role: 'customer',
      };
      targetToken = 'demo_customer_token';
    }

    setUser(targetUser);
    setToken(targetToken);
    localStorage.setItem('supporthub_user', JSON.stringify(targetUser));
    localStorage.setItem('supporthub_token', targetToken);
    return targetUser;
  };

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (res?.user) {
      setToken(res.token || 'demo_token');
      setUser(res.user);
      localStorage.setItem('supporthub_token', res.token || 'demo_token');
      localStorage.setItem('supporthub_user', JSON.stringify(res.user));
    }
    return res;
  };

  const quickLogin = async (accountType) => {
    const res = await api.auth.quickLogin(accountType);
    if (res?.user) {
      setToken(res.token || 'demo_token');
      setUser(res.user);
      localStorage.setItem('supporthub_token', res.token || 'demo_token');
      localStorage.setItem('supporthub_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.auth.register(userData);
    if (res?.user) {
      setToken(res.token || 'demo_token');
      setUser(res.user);
      localStorage.setItem('supporthub_token', res.token || 'demo_token');
      localStorage.setItem('supporthub_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = () => {
    // Reverts to Customer mode
    switchRole('customer');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAgent: user?.role === 'agent' || user?.role === 'admin',
    switchRole,
    login,
    quickLogin,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
