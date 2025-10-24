import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireRole } from "./auth";
import { 
  insertMachineSchema, 
  insertProductSchema, 
  insertStoppageCauseSchema,
  insertTechnicianSchema,
  insertDowntimeRecordSchema,
  insertUserSchema,
  insertFailureDiagnosticSchema,
  insertProductionBatchSchema,
  type User
} from "@shared/schema";
import {
  broadcastMachineStatusChange,
  broadcastTicketCreated,
  broadcastTicketAccepted,
  broadcastTicketClosed,
  broadcastBatchStarted,
  broadcastBatchFinished,
  broadcastMachineStopped
} from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  // Public registration - always creates operator role for security
  app.post("/api/register", async (req, res) => {
    try {
      const { password, ...userData } = req.body;

      // Validate required fields
      if (!password) {
        return res.status(400).json({ error: "La contraseña es requerida" });
      }

      // Validate user data with Zod schema, omit role and passwordHash
      const validated = insertUserSchema
        .omit({ passwordHash: true, role: true })
        .parse(userData);

      // Check if user exists
      const existingUser = await storage.getUserByEmail(validated.email);
      if (existingUser) {
        return res.status(400).json({ error: "El email ya está registrado" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user - ALWAYS assign operator role for security
      const user = await storage.createUser({
        ...validated,
        role: "operator", // Force operator role on public registration
        passwordHash,
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ error: "Datos de usuario inválidos" });
      }
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Error de autenticación" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Credenciales inválidas" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error al iniciar sesión" });
        }

        // Remove password hash from response
        const { passwordHash, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  app.get("/api/me", requireAuth, (req, res) => {
    const user = req.user as User;
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // User management endpoints (admin only)
  app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove password hashes from response
      const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { password, ...updateData } = req.body;
      
      // If password is being updated, hash it
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await storage.updateUser(parseInt(req.params.id), updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteUser(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Failure Diagnostics endpoints (admin only)
  app.get("/api/diagnostics", requireAuth, async (req, res) => {
    try {
      const diagnostics = await storage.getFailureDiagnostics();
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diagnostics" });
    }
  });

  app.post("/api/diagnostics", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validated = insertFailureDiagnosticSchema.parse(req.body);
      const diagnostic = await storage.createFailureDiagnostic(validated);
      res.status(201).json(diagnostic);
    } catch (error) {
      res.status(400).json({ error: "Invalid diagnostic data" });
    }
  });

  app.patch("/api/diagnostics/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validated = insertFailureDiagnosticSchema.partial().parse(req.body);
      const diagnostic = await storage.updateFailureDiagnostic(parseInt(req.params.id), validated);
      if (!diagnostic) {
        return res.status(404).json({ error: "Diagnostic not found" });
      }
      res.json(diagnostic);
    } catch (error) {
      res.status(400).json({ error: "Invalid diagnostic data" });
    }
  });

  app.delete("/api/diagnostics/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteFailureDiagnostic(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete diagnostic" });
    }
  });

  // Production Batches endpoints
  app.get("/api/batches", requireAuth, async (req, res) => {
    try {
      const batches = await storage.getProductionBatches();
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  app.get("/api/batches/:id", requireAuth, async (req, res) => {
    try {
      const batch = await storage.getProductionBatch(parseInt(req.params.id));
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch batch" });
    }
  });

  app.get("/api/machines/:machineId/active-batch", requireAuth, async (req, res) => {
    try {
      const batch = await storage.getActiveBatchByMachine(parseInt(req.params.machineId));
      if (!batch) {
        return res.status(404).json({ error: "No active batch found for this machine" });
      }
      res.json(batch);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active batch" });
    }
  });

  app.post("/api/batches", requireAuth, async (req, res) => {
    try {
      const validated = insertProductionBatchSchema.parse(req.body);
      const batch = await storage.createProductionBatch(validated);
      res.status(201).json(batch);
    } catch (error: any) {
      if (error.message && error.message.includes("Ya existe un lote activo")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(400).json({ error: "Invalid batch data" });
    }
  });

  app.patch("/api/batches/:id", requireAuth, async (req, res) => {
    try {
      const validated = insertProductionBatchSchema.partial().parse(req.body);
      const batch = await storage.updateProductionBatch(parseInt(req.params.id), validated);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      res.status(400).json({ error: "Invalid batch data" });
    }
  });

  app.post("/api/batches/:id/finish", requireAuth, async (req, res) => {
    try {
      const { actualQuantity } = req.body;
      if (typeof actualQuantity !== "number" || actualQuantity < 0) {
        return res.status(400).json({ error: "Invalid actual quantity" });
      }
      const batch = await storage.finishProductionBatch(parseInt(req.params.id), actualQuantity);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      res.status(500).json({ error: "Failed to finish batch" });
    }
  });

  // Machines endpoints
  app.get("/api/machines", async (req, res) => {
    try {
      const machines = await storage.getMachines();
      res.json(machines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch machines" });
    }
  });

  app.get("/api/machines/:id", async (req, res) => {
    try {
      const machine = await storage.getMachine(parseInt(req.params.id));
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch machine" });
    }
  });

  app.post("/api/machines", async (req, res) => {
    try {
      const validated = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(validated);
      res.status(201).json(machine);
    } catch (error) {
      res.status(400).json({ error: "Invalid machine data" });
    }
  });

  app.patch("/api/machines/:id", async (req, res) => {
    try {
      const validated = insertMachineSchema.partial().parse(req.body);
      const machine = await storage.updateMachine(parseInt(req.params.id), validated);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      res.status(400).json({ error: "Invalid machine data" });
    }
  });

  app.delete("/api/machines/:id", async (req, res) => {
    try {
      await storage.deleteMachine(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete machine" });
    }
  });

  app.post("/api/machines/:id/unlock", requireAuth, requireRole("supervisor", "admin"), async (req, res) => {
    try {
      const machineId = parseInt(req.params.id);
      const machine = await storage.unlockMachine(machineId);
      if (!machine) {
        return res.status(404).json({ error: "Machine not found" });
      }

      // Log the manual unlock action in audit log
      const user = req.user as User;
      await storage.createAuditLog({
        userId: user.id,
        actionType: "unlock_machine",
        entityType: "machine",
        entityId: machineId,
        details: {
          machineName: machine.name,
          previousStatus: "Bloqueada",
          newStatus: "Operativa",
          unlockedBy: user.name,
          userRole: user.role,
        },
      });

      res.json(machine);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unlock machine";
      res.status(500).json({ error: message });
    }
  });

  // Products endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const validated = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(parseInt(req.params.id), validated);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Stoppage Causes endpoints
  app.get("/api/stoppage-causes", async (req, res) => {
    try {
      const causes = await storage.getStoppageCauses();
      res.json(causes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stoppage causes" });
    }
  });

  app.get("/api/stoppage-causes/:id", async (req, res) => {
    try {
      const cause = await storage.getStoppageCause(parseInt(req.params.id));
      if (!cause) {
        return res.status(404).json({ error: "Stoppage cause not found" });
      }
      res.json(cause);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stoppage cause" });
    }
  });

  app.post("/api/stoppage-causes", async (req, res) => {
    try {
      const validated = insertStoppageCauseSchema.parse(req.body);
      const cause = await storage.createStoppageCause(validated);
      res.status(201).json(cause);
    } catch (error) {
      res.status(400).json({ error: "Invalid stoppage cause data" });
    }
  });

  app.patch("/api/stoppage-causes/:id", async (req, res) => {
    try {
      const validated = insertStoppageCauseSchema.partial().parse(req.body);
      const cause = await storage.updateStoppageCause(parseInt(req.params.id), validated);
      if (!cause) {
        return res.status(404).json({ error: "Stoppage cause not found" });
      }
      res.json(cause);
    } catch (error) {
      res.status(400).json({ error: "Invalid stoppage cause data" });
    }
  });

  app.delete("/api/stoppage-causes/:id", async (req, res) => {
    try {
      await storage.deleteStoppageCause(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete stoppage cause" });
    }
  });

  // Technicians endpoints
  app.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json(technicians);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });

  app.get("/api/technicians/:id", async (req, res) => {
    try {
      const technician = await storage.getTechnician(parseInt(req.params.id));
      if (!technician) {
        return res.status(404).json({ error: "Technician not found" });
      }
      res.json(technician);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch technician" });
    }
  });

  app.post("/api/technicians", async (req, res) => {
    try {
      const validated = insertTechnicianSchema.parse(req.body);
      const technician = await storage.createTechnician(validated);
      res.status(201).json(technician);
    } catch (error) {
      res.status(400).json({ error: "Invalid technician data" });
    }
  });

  app.patch("/api/technicians/:id", async (req, res) => {
    try {
      const validated = insertTechnicianSchema.partial().parse(req.body);
      const technician = await storage.updateTechnician(parseInt(req.params.id), validated);
      if (!technician) {
        return res.status(404).json({ error: "Technician not found" });
      }
      res.json(technician);
    } catch (error) {
      res.status(400).json({ error: "Invalid technician data" });
    }
  });

  app.delete("/api/technicians/:id", async (req, res) => {
    try {
      await storage.deleteTechnician(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete technician" });
    }
  });

  // Downtime Records endpoints
  app.get("/api/downtime-records", async (req, res) => {
    try {
      const records = await storage.getDowntimeRecords();
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch downtime records" });
    }
  });

  app.get("/api/downtime-records/:id", async (req, res) => {
    try {
      const record = await storage.getDowntimeRecord(parseInt(req.params.id));
      if (!record) {
        return res.status(404).json({ error: "Downtime record not found" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch downtime record" });
    }
  });

  app.post("/api/downtime-records", async (req, res) => {
    try {
      // Validate and parse required fields
      const { machineId, causeId, productId, quantity } = req.body;
      
      if (!machineId || !causeId) {
        return res.status(400).json({ error: "Machine ID and Cause ID are required" });
      }

      // Parse IDs as numbers (type safety)
      const parsedMachineId = parseInt(machineId);
      const parsedCauseId = parseInt(causeId);
      const parsedProductId = productId ? parseInt(productId) : null;
      const parsedQuantity = quantity ? parseInt(quantity) : null;

      if (isNaN(parsedMachineId) || isNaN(parsedCauseId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      if (parsedProductId !== null && isNaN(parsedProductId)) {
        return res.status(400).json({ error: "Invalid product ID format" });
      }

      // Delegate to storage layer - business logic handled there
      const recordData = {
        machineId: parsedMachineId,
        causeId: parsedCauseId,
        productId: parsedProductId,
        quantity: parsedQuantity,
      };

      const record = await storage.createDowntimeRecord(recordData);
      
      // Broadcast events if maintenance is required
      if (record.requiresMaintenance) {
        // Get full record with relations for broadcast
        const fullRecord = await storage.getDowntimeRecord(record.id);
        if (fullRecord) {
          broadcastTicketCreated(record.id, record.machineId, fullRecord);
          broadcastMachineStopped(record.machineId, fullRecord);
        }
      }
      
      res.status(201).json(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid downtime record data";
      res.status(400).json({ error: message });
    }
  });

  // Maintenance Tickets endpoints
  app.get("/api/maintenance-tickets/active", async (req, res) => {
    try {
      const tickets = await storage.getActiveMaintenanceTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active tickets" });
    }
  });

  app.get("/api/maintenance-tickets/history", async (req, res) => {
    try {
      const tickets = await storage.getHistoricalMaintenanceTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch historical tickets" });
    }
  });

  app.patch("/api/maintenance-tickets/:id/accept", async (req, res) => {
    try {
      const { technicianId } = req.body;
      if (!technicianId) {
        return res.status(400).json({ error: "Technician ID is required" });
      }
      const record = await storage.acceptMaintenanceTicket(parseInt(req.params.id), technicianId);
      if (!record) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      // Broadcast ticket acceptance
      broadcastTicketAccepted(record.id, record);
      
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to accept ticket" });
    }
  });

  app.patch("/api/maintenance-tickets/:id/close", async (req, res) => {
    try {
      const { notes } = req.body;
      const record = await storage.closeMaintenanceTicket(parseInt(req.params.id), notes || "");
      if (!record) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      // Broadcast ticket closure (triggers machine unlock)
      broadcastTicketClosed(record.id, record.machineId, record);
      
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to close ticket" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
