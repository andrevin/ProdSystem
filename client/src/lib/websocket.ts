import { useEffect, useRef, useState } from "react";
import type { User } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(user: User | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      // Not authenticated, don't connect
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Connect to WebSocket server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("[WebSocket Client] Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WebSocket Client] Connected successfully");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[WebSocket Client] Received message:", message);
        setLastMessage(message);
      } catch (error) {
        console.error("[WebSocket Client] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket Client] Error:", error);
    };

    ws.onclose = (event) => {
      console.log("[WebSocket Client] Disconnected:", event.code, event.reason);
      setIsConnected(false);
    };

    // Cleanup on unmount or user change
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket Client] Cannot send message, not connected");
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
