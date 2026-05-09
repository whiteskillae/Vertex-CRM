"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  isConnected: false,
  reconnect: () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = () => {
    if (!user || socketRef.current?.connected) return;

    // If already connecting, don't start another one
    if (socketRef.current && !socketRef.current.connected) {
      console.log('[SOCKET] Connection attempt already in progress...');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;

    let token = localStorage.getItem('token');
    if (!token) {
      token = document.cookie.split('; ').find(row => row.trim().startsWith('token='))?.split('=')[1];
    }

    console.log('[SOCKET] Initializing connection to:', socketUrl);

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      auth: { token },
      path: '/socket.io/'
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('[SOCKET] Connected established:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[SOCKET] Connection Error:', err.message);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
      
      // If disconnected by server, try to reconnect gracefully
      if (reason === "io server disconnect") {
        socketInstance.connect();
      }
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);
  };

  useEffect(() => {
    let mounted = true;

    if (user) {
      connectSocket();
    } else {
      if (socketRef.current) {
        console.log('[SOCKET] Cleaning up connection due to user logout');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    }

    return () => {
      mounted = false;
      // We don't necessarily want to disconnect the global socket on every re-render
      // Only if the provider is actually unmounting or user changes
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect: connectSocket }}>
      {children}
    </SocketContext.Provider>
  );
};
