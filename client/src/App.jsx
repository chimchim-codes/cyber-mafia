import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';
import StoreDemo from './components/storefront/StoreDemo';
import FloatingWidget from './components/chat/FloatingWidget';
import AgentDashboard from './components/agent/AgentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginModal from './components/auth/LoginModal';

function AppContent() {
  const [currentView, setCurrentView] = useState('store'); // 'store' | 'agent' | 'admin'
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { switchRole } = useAuth();

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === 'admin') {
      switchRole('admin');
    } else if (view === 'agent') {
      switchRole('agent');
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    const role = loggedInUser?.role;
    if (role === 'admin') setCurrentView('admin');
    else if (role === 'agent') setCurrentView('agent');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={handleViewChange}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Main View Display */}
      <main className="flex-1">
        {currentView === 'store' && (
          <>
            <StoreDemo />
            {/* The Floating Real-Time Support Chatbot Widget */}
            <FloatingWidget />
          </>
        )}

        {currentView === 'agent' && <AgentDashboard />}

        {currentView === 'admin' && <AdminDashboard />}
      </main>

      {/* Login / Persona Switcher Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
