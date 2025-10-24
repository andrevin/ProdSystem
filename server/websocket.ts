import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { ServerResponse } from "http";
import type { IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import type { User } from "@shared/schema";
import { sessionMiddleware } from "./session";
import passport from "passport";

// Extended WebSocket with user info
interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  userRole?: string;
  isAlive?: boolean;
}

// Extend IncomingMessage to include session and user
interface AuthenticatedRequest extends IncomingMessage {
  session?: any;
  user?: User;
  sessionID?: string;
}

// Connection management
const clients = new Map<number, Set<AuthenticatedWebSocket>>(); // userId -> Set of connections
const machineRooms = new Map<number, Set<AuthenticatedWebSocket>>(); // machineId -> Set of connections
const roleRooms = new Map<string, Set<AuthenticatedWebSocket>>(); // role -> Set of connections

// Allowed origins for WebSocket connections (prevent CSRF)
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return false; // Reject if no origin header
  }

  // In development, allow all origins from same host
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // In production, check against allowed origins
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN || "",
    `https://${process.env.REPLIT_DOMAIN || ""}`,
  ].filter(Boolean);

  return allowedOrigins.some((allowed) => origin.startsWith(allowed));
}

// Authenticate WebSocket connection using Express session middleware
function authenticateWebSocketConnection(
  request: AuthenticatedRequest,
  socket: any
): Promise<User | null> {
  return new Promise((resolve) => {
    // Create a proper ServerResponse attached to the socket
    const res = new ServerResponse(request);
    res.assignSocket(socket);

    // Run session middleware to populate request.session
    sessionMiddleware(request as any, res as any, (err?: any) => {
      if (err) {
        console.error("[WebSocket] Session middleware error:", err);
        return resolve(null);
      }

      // Run passport.initialize() to set up _passport context
      passport.initialize()(request as any, res as any, (err?: any) => {
        if (err) {
          console.error("[WebSocket] Passport initialize error:", err);
          return resolve(null);
        }

        // Run passport.session() to deserialize user from session
        passport.session()(request as any, res as any, (err?: any) => {
          if (err) {
            console.error("[WebSocket] Passport session error:", err);
            return resolve(null);
          }

          // Check if user was deserialized by Passport
          if (!request.user) {
            console.log("[WebSocket] No user found in session");
            return resolve(null);
          }

          // Return the authenticated user
          console.log(`[WebSocket] User authenticated: ${request.user.id} (${request.user.role})`);
          resolve(request.user);
        });
      });
    });
  });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
    path: "/ws" 
  });

  // Handle HTTP upgrade for WebSocket - AUTHENTICATE & VALIDATE ORIGIN HERE
  server.on("upgrade", async (request: IncomingMessage, socket, head) => {
    const { pathname } = parseUrl(request.url || "");

    if (pathname === "/ws") {
      try {
        // Validate origin to prevent CSRF attacks
        const origin = request.headers.origin || request.headers.referer;
        if (!isOriginAllowed(origin)) {
          console.log("[WebSocket] Rejected connection from unauthorized origin:", origin);
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }

        // Authenticate using Express session + Passport
        const user = await authenticateWebSocketConnection(request as AuthenticatedRequest, socket);

        if (!user) {
          console.log("[WebSocket] Unauthenticated connection attempt rejected");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        // Upgrade connection with authenticated user
        wss.handleUpgrade(request, socket, head, (ws) => {
          const authWs = ws as AuthenticatedWebSocket;
          authWs.userId = user.id;
          authWs.userRole = user.role;
          wss.emit("connection", authWs, request);
        });
      } catch (error) {
        console.error("[WebSocket] Authentication error:", error);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  // Handle new WebSocket connections (ALREADY AUTHENTICATED)
  wss.on("connection", (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
    console.log(`[WebSocket] Authenticated connection from user ${ws.userId} (role: ${ws.userRole})`);

    ws.isAlive = true;

    // Add to connection maps
    if (ws.userId && ws.userRole) {
      // Add to user connections map
      if (!clients.has(ws.userId)) {
        clients.set(ws.userId, new Set());
      }
      clients.get(ws.userId)!.add(ws);

      // Add to role room
      if (!roleRooms.has(ws.userRole)) {
        roleRooms.set(ws.userRole, new Set());
      }
      roleRooms.get(ws.userRole)!.add(ws);
    }
    
    // Send connection confirmation with user info
    ws.send(JSON.stringify({
      type: "connected",
      userId: ws.userId,
      userRole: ws.userRole,
      message: "WebSocket connection established"
    }));

    // Handle incoming messages
    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Invalid message format"
        }));
      }
    });

    // Handle pong response (for heartbeat)
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log(`[WebSocket] Client disconnected (userId: ${ws.userId})`);
      removeFromRooms(ws);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });
  });

  // Heartbeat to detect broken connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const authWs = ws as AuthenticatedWebSocket;
      
      if (authWs.isAlive === false) {
        console.log(`[WebSocket] Terminating inactive connection (userId: ${authWs.userId})`);
        removeFromRooms(authWs);
        return authWs.terminate();
      }

      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000); // Check every 30 seconds

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  console.log("[WebSocket] Server setup complete");

  return wss;
}

// Handle different message types
function handleMessage(ws: AuthenticatedWebSocket, message: any) {
  // Connection is already authenticated - only handle room management
  switch (message.type) {
    case "join_machine":
      joinMachineRoom(ws, message.machineId);
      break;
    
    case "leave_machine":
      leaveMachineRoom(ws, message.machineId);
      break;
    
    default:
      ws.send(JSON.stringify({
        type: "error",
        message: `Unknown message type: ${message.type}`
      }));
  }
}

// Join a machine room (for operators monitoring specific machine)
function joinMachineRoom(ws: AuthenticatedWebSocket, machineId: number) {
  if (!ws.userId) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Not authenticated"
    }));
    return;
  }

  if (!machineRooms.has(machineId)) {
    machineRooms.set(machineId, new Set());
  }
  machineRooms.get(machineId)!.add(ws);

  console.log(`[WebSocket] User ${ws.userId} joined machine room ${machineId}`);

  ws.send(JSON.stringify({
    type: "joined_machine",
    machineId
  }));
}

// Leave a machine room
function leaveMachineRoom(ws: AuthenticatedWebSocket, machineId: number) {
  const room = machineRooms.get(machineId);
  if (room) {
    room.delete(ws);
    console.log(`[WebSocket] User ${ws.userId} left machine room ${machineId}`);
  }
}

// Remove connection from all rooms
function removeFromRooms(ws: AuthenticatedWebSocket) {
  // Remove from user connections
  if (ws.userId) {
    const userConns = clients.get(ws.userId);
    if (userConns) {
      userConns.delete(ws);
      if (userConns.size === 0) {
        clients.delete(ws.userId);
      }
    }
  }

  // Remove from role room
  if (ws.userRole) {
    const roleRoom = roleRooms.get(ws.userRole);
    if (roleRoom) {
      roleRoom.delete(ws);
    }
  }

  // Remove from all machine rooms
  machineRooms.forEach((room) => {
    room.delete(ws);
  });
}

// Broadcast functions for different events

/**
 * Broadcast machine status change to all clients monitoring that machine
 * and to all supervisors/admins
 */
export function broadcastMachineStatusChange(machineId: number, machineData: any) {
  const message = JSON.stringify({
    type: "machine_status_changed",
    machineId,
    data: machineData
  });

  // Send to all clients in machine room
  const machineRoom = machineRooms.get(machineId);
  if (machineRoom) {
    machineRoom.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send to all supervisors and admins
  broadcastToRoles(["supervisor", "admin"], message);
}

/**
 * Broadcast new ticket creation to maintenance chiefs and supervisors
 */
export function broadcastTicketCreated(ticketData: any) {
  const message = JSON.stringify({
    type: "ticket_created",
    data: ticketData
  });

  broadcastToRoles(["maintenance_chief", "supervisor", "admin"], message);
}

/**
 * Broadcast ticket assignment to the specific technician and maintenance chiefs
 */
export function broadcastTicketAssigned(ticketId: number, technicianId: number, ticketData: any) {
  const message = JSON.stringify({
    type: "ticket_assigned",
    ticketId,
    data: ticketData
  });

  // Send to specific technician
  const techConnections = clients.get(technicianId);
  if (techConnections) {
    techConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send to maintenance chiefs and admins
  broadcastToRoles(["maintenance_chief", "admin", "technician"], message);
}

/**
 * Broadcast ticket acceptance (technician accepted the assigned ticket)
 */
export function broadcastTicketAccepted(ticketId: number, ticketData: any) {
  const message = JSON.stringify({
    type: "ticket_accepted",
    ticketId,
    data: ticketData
  });

  broadcastToRoles(["maintenance_chief", "supervisor", "admin", "technician"], message);
}

/**
 * Broadcast ticket closure - critical for unlocking machines
 */
export function broadcastTicketClosed(ticketId: number, machineId: number, ticketData: any) {
  const message = JSON.stringify({
    type: "ticket_closed",
    ticketId,
    machineId,
    data: ticketData
  });

  // Send to machine room (operators)
  const machineRoom = machineRooms.get(machineId);
  if (machineRoom) {
    machineRoom.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send to maintenance and supervisors
  broadcastToRoles(["maintenance_chief", "supervisor", "admin", "technician"], message);
}

/**
 * Broadcast batch start to supervisors and relevant machine room
 */
export function broadcastBatchStarted(machineId: number, batchData: any) {
  const message = JSON.stringify({
    type: "batch_started",
    machineId,
    data: batchData
  });

  // Send to machine room
  const machineRoom = machineRooms.get(machineId);
  if (machineRoom) {
    machineRoom.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send to supervisors
  broadcastToRoles(["supervisor", "admin"], message);
}

/**
 * Broadcast batch completion
 */
export function broadcastBatchFinished(machineId: number, batchData: any) {
  const message = JSON.stringify({
    type: "batch_finished",
    machineId,
    data: batchData
  });

  // Send to machine room
  const machineRoom = machineRooms.get(machineId);
  if (machineRoom) {
    machineRoom.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send to supervisors
  broadcastToRoles(["supervisor", "admin"], message);
}

/**
 * Broadcast machine stoppage (for supervisor notifications)
 */
export function broadcastMachineStopped(machineId: number, stoppageData: any) {
  const message = JSON.stringify({
    type: "machine_stopped",
    machineId,
    data: stoppageData
  });

  // Send to machine room
  const machineRoom = machineRooms.get(machineId);
  if (machineRoom) {
    machineRoom.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Send to supervisors (they want to know about all stoppages)
  broadcastToRoles(["supervisor", "admin"], message);
}

// Helper function to broadcast to specific roles
function broadcastToRoles(roles: string[], message: string) {
  roles.forEach((role) => {
    const roleRoom = roleRooms.get(role);
    if (roleRoom) {
      roleRoom.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  });
}

// Export for debugging
export function getConnectionStats() {
  return {
    totalClients: clients.size,
    totalConnections: Array.from(clients.values()).reduce((sum, set) => sum + set.size, 0),
    machineRooms: Array.from(machineRooms.keys()),
    roles: Array.from(roleRooms.keys())
  };
}
