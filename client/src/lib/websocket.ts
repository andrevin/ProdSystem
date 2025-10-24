import { useEffect, useRef, useState, useCallback } from "react";
import type { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type EventHandler = (data: any) => void;

export function useWebSocket(user: User | null) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

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
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("[WebSocket Client] Received message:", message);
        
        // Handle the message
        handleWebSocketMessage(message);
        
        // Call registered event handlers
        const handlers = eventHandlersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message));
        }
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

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket Client] Cannot send message, not connected");
    }
  }, []);

  const subscribe = useCallback((eventType: string, handler: EventHandler) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    subscribe,
  };
}

/**
 * Handle WebSocket messages and invalidate relevant queries
 */
function handleWebSocketMessage(message: WebSocketMessage) {
  switch (message.type) {
    case "connected":
      // Connection confirmation, no action needed
      console.log("[WebSocket] Connected as user", message.userId, "with role", message.userRole);
      break;

    case "machine_status_changed":
      // Invalidate machine queries
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId, "active-batch"] });
      console.log("[WebSocket] Machine status changed:", message.machineId);
      break;

    case "ticket_created":
      // Invalidate maintenance ticket queries
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/history"] });
      console.log("[WebSocket] Ticket created:", message.data);
      break;

    case "ticket_assigned":
      // Invalidate maintenance ticket queries
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets", message.ticketId] });
      console.log("[WebSocket] Ticket assigned:", message.ticketId);
      break;

    case "ticket_accepted":
      // Invalidate maintenance ticket queries
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets", message.ticketId] });
      console.log("[WebSocket] Ticket accepted:", message.ticketId);
      break;

    case "ticket_closed":
      // Invalidate maintenance ticket queries AND machine queries (for unlock)
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets", message.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId, "active-batch"] });
      console.log("[WebSocket] Ticket closed:", message.ticketId, "Machine unlocked:", message.machineId);
      break;

    case "batch_started":
      // Invalidate batch queries and machine queries
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId, "active-batch"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId] });
      console.log("[WebSocket] Batch started:", message.data);
      break;

    case "batch_finished":
      // Invalidate batch queries and machine queries
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId, "active-batch"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId] });
      console.log("[WebSocket] Batch finished:", message.data);
      break;

    case "machine_stopped":
      // Invalidate machine queries and downtime queries
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines", message.machineId] });
      queryClient.invalidateQueries({ queryKey: ["/api/downtime-records"] });
      console.log("[WebSocket] Machine stopped:", message.machineId);
      break;

    default:
      console.log("[WebSocket] Unknown message type:", message.type);
  }
}

/**
 * Hook to join a specific machine room
 */
export function useJoinMachineRoom(machineId: number | null, enabled: boolean = true) {
  const wsRef = useRef<{ sendMessage: (msg: any) => void } | null>(null);
  const currentMachineIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !machineId) {
      return;
    }

    // Store the sendMessage function from the WebSocket context
    // This will be called from the parent component that uses useWebSocket

    return () => {
      // Leave machine room on unmount
      if (currentMachineIdRef.current && wsRef.current) {
        wsRef.current.sendMessage({
          type: "leave_machine",
          machineId: currentMachineIdRef.current
        });
      }
    };
  }, [machineId, enabled]);

  const joinMachineRoom = useCallback((sendMessage: (msg: any) => void) => {
    if (!machineId) return;

    // Leave previous room if any
    if (currentMachineIdRef.current && currentMachineIdRef.current !== machineId) {
      sendMessage({
        type: "leave_machine",
        machineId: currentMachineIdRef.current
      });
    }

    // Join new room
    sendMessage({
      type: "join_machine",
      machineId
    });

    currentMachineIdRef.current = machineId;
    wsRef.current = { sendMessage };
  }, [machineId]);

  return joinMachineRoom;
}
