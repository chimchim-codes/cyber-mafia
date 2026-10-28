import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined'
    ? (window.location.port === '5001' ? window.location.origin : `${window.location.protocol}//${window.location.hostname}:5001`)
    : 'http://localhost:5001'
);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [onlineAgentsCount, setOnlineAgentsCount] = useState(1);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ Socket connected to server:', socket.id);
      setIsConnected(true);
      setIsReconnecting(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Socket reconnect attempt #${attempt}`);
      setIsReconnecting(true);
    });

    socket.on('reconnect', () => {
      console.log('✅ Socket reconnected successfully');
      setIsConnected(true);
      setIsReconnecting(false);
    });

    socket.on('online_agents_count', ({ count }) => {
      setOnlineAgentsCount(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    onlineAgentsCount,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
