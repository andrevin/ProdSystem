import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertMachineSchema, 
  insertProductSchema, 
  insertStoppageCauseSchema,
  insertTechnicianSchema,
  insertDowntimeRecordSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to close ticket" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
