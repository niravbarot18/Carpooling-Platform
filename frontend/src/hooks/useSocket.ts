import { useEffect, useRef, useState, useCallback } from 'react';

const WEBSOCKET_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const useSocket = (path: string) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Append token to the URL so that backend channels middleware can authenticate
    const wsUrl = `${WEBSOCKET_BASE_URL}${path}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log(`WebSocket connected to: ${path}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log(`WebSocket closed: ${path}`);
      // Retry connection after 5 seconds if not explicitly closed
      setTimeout(() => {
        if (socketRef.current === ws) {
          connect();
        }
      }, 5000);
    };

    socketRef.current = ws;
  }, [path]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendJson = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn("Attempted to send message while WebSocket is disconnected");
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { isConnected, messages, sendJson, clearMessages };
};
