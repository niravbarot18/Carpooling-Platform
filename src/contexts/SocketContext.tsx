import React, { createContext, useContext, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api';

interface SocketContextType {
  getChatSocket: (roomName: string) => WebSocket;
  getTripSocket: (tripId: number | string) => WebSocket;
  closeSocket: (url: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketsRef = useRef<{ [key: string]: WebSocket }>({});

  const getWsUrl = (path: string): string => {
    const base = API_BASE_URL.replace(/^http/, 'ws');
    return `${base}${path}`;
  };

  const getChatSocket = (roomName: string): WebSocket => {
    const url = getWsUrl(`/ws/chat/${roomName}/`);
    
    // Return existing open socket if available
    if (socketsRef.current[url] && socketsRef.current[url].readyState === WebSocket.OPEN) {
      return socketsRef.current[url];
    }

    // Otherwise create new connection
    const ws = new WebSocket(url);
    socketsRef.current[url] = ws;
    
    ws.onclose = () => {
      delete socketsRef.current[url];
    };

    return ws;
  };

  const getTripSocket = (tripId: number | string): WebSocket => {
    const url = getWsUrl(`/ws/trips/${tripId}/`);

    if (socketsRef.current[url] && socketsRef.current[url].readyState === WebSocket.OPEN) {
      return socketsRef.current[url];
    }

    const ws = new WebSocket(url);
    socketsRef.current[url] = ws;

    ws.onclose = () => {
      delete socketsRef.current[url];
    };

    return ws;
  };

  const closeSocket = (url: string) => {
    if (socketsRef.current[url]) {
      socketsRef.current[url].close();
      delete socketsRef.current[url];
    }
  };

  // Close all sockets when app unmounts
  useEffect(() => {
    return () => {
      Object.keys(socketsRef.current).forEach((url) => {
        socketsRef.current[url].close();
      });
    };
  }, []);

  return (
    <SocketContext.Provider value={{ getChatSocket, getTripSocket, closeSocket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
