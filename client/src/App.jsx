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
  const { isAuthenticated, isAgent, isAdmin } = useAuth();

  const handleLoginSuccess = () => {
    if (isAdmin) setCurrentView('admin');
    else if (isAgent) setCurrentView('agent');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
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

        {currentView === 'agent' && (
          isAuthenticated ? (
            <AgentDashboard />
          ) : (
            <div className="p-12 text-center text-slate-500 max-w-md mx-auto space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Agent Access Restricted</h2>
              <p className="text-xs">Please sign in as a support agent to view and respond to live tickets.</p>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Sign In to Agent Desk
              </button>
            </div>
          )
        )}

        {currentView === 'admin' && (
          isAuthenticated && isAdmin ? (
            <AdminDashboard />
          ) : (
            <div className="p-12 text-center text-slate-500 max-w-md mx-auto space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Admin Access Restricted</h2>
              <p className="text-xs">Administrator privileges are required to view backend analytics and manage knowledge base FAQs.</p>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Sign In as Admin
              </button>
            </div>
          )
        )}
      </main>

      {/* Login Modal */}
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
