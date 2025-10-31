// Reference: javascript_database blueprint - adapted for production management system
import { 
  machines, 
  products, 
  stoppageCauses, 
  technicians,
  downtimeRecords,
  users,
  failureDiagnostics,
  productionBatches,
  auditLogs,
  pushSubscriptions,
  type Machine, 
  type Product, 
  type StoppageCause, 
  type Technician,
  type DowntimeRecord,
  type DowntimeRecordWithRelations,
  type User,
  type FailureDiagnostic,
  type ProductionBatch,
  type AuditLog,
  type PushSubscription,
  type InsertMachine, 
  type InsertProduct, 
  type InsertStoppageCause, 
  type InsertTechnician,
  type InsertDowntimeRecord,
  type InsertUser,
  type InsertFailureDiagnostic,
  type InsertProductionBatch,
  type InsertAuditLog,
  type InsertPushSubscription
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  // Machines
  getMachines(): Promise<Machine[]>;
  getMachine(id: number): Promise<Machine | undefined>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachine(id: number, machine: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: number): Promise<void>;
  unlockMachine(machineId: number): Promise<Machine | undefined>;
  resumeMachine(machineId: number): Promise<Machine | undefined>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Stoppage Causes
  getStoppageCauses(): Promise<StoppageCause[]>;
  getStoppageCause(id: number): Promise<StoppageCause | undefined>;
  createStoppageCause(cause: InsertStoppageCause): Promise<StoppageCause>;
  updateStoppageCause(id: number, cause: Partial<InsertStoppageCause>): Promise<StoppageCause | undefined>;
  deleteStoppageCause(id: number): Promise<void>;

  // Technicians
  getTechnicians(): Promise<Technician[]>;
  getTechnician(id: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, technician: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: number): Promise<void>;

  // Failure Diagnostics
  getFailureDiagnostics(): Promise<FailureDiagnostic[]>;
  getFailureDiagnostic(id: number): Promise<FailureDiagnostic | undefined>;
  createFailureDiagnostic(diagnostic: InsertFailureDiagnostic): Promise<FailureDiagnostic>;
  updateFailureDiagnostic(id: number, diagnostic: Partial<InsertFailureDiagnostic>): Promise<FailureDiagnostic | undefined>;
  deleteFailureDiagnostic(id: number): Promise<void>;

  // Downtime Records
  getDowntimeRecords(): Promise<DowntimeRecordWithRelations[]>;
  getDowntimeRecord(id: number): Promise<DowntimeRecordWithRelations | undefined>;
  createDowntimeRecord(record: InsertDowntimeRecord): Promise<DowntimeRecord>;
  updateDowntimeRecord(id: number, record: Partial<DowntimeRecord>): Promise<DowntimeRecord | undefined>;
  
  // Maintenance Tickets
  getActiveMaintenanceTickets(): Promise<DowntimeRecordWithRelations[]>;
  getHistoricalMaintenanceTickets(): Promise<DowntimeRecordWithRelations[]>;
  acceptMaintenanceTicket(id: number, technicianId: number): Promise<DowntimeRecord | undefined>;
  closeMaintenanceTicket(id: number, notes: string): Promise<DowntimeRecord | undefined>;

  // Production Batches
  getProductionBatches(): Promise<ProductionBatch[]>;
  getProductionBatch(id: number): Promise<ProductionBatch | undefined>;
  getActiveBatchByMachine(machineId: number): Promise<ProductionBatch | undefined>;
  createProductionBatch(batch: InsertProductionBatch): Promise<ProductionBatch>;
  updateProductionBatch(id: number, batch: Partial<ProductionBatch>): Promise<ProductionBatch | undefined>;
  finishProductionBatch(id: number, producedQuantity: number): Promise<ProductionBatch | undefined>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Push Subscriptions
  getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(id: number): Promise<void>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Machines
  async getMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  async getMachine(id: number): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine || undefined;
  }

  async createMachine(insertMachine: InsertMachine): Promise<Machine> {
    const [machine] = await db.insert(machines).values(insertMachine).returning();
    return machine;
  }

  async updateMachine(id: number, updateData: Partial<InsertMachine>): Promise<Machine | undefined> {
    const [machine] = await db
      .update(machines)
      .set(updateData)
      .where(eq(machines.id, id))
      .returning();
    return machine || undefined;
  }

  async deleteMachine(id: number): Promise<void> {
    await db.delete(machines).where(eq(machines.id, id));
  }

  async unlockMachine(machineId: number): Promise<Machine | undefined> {
    const machine = await this.getMachine(machineId);
    if (!machine) {
      return undefined;
    }
    
    return await this.updateMachine(machineId, {
      operationalStatus: "Operativa",
    });
  }

  async resumeMachine(machineId: number): Promise<Machine | undefined> {
    const machine = await this.getMachine(machineId);
    if (!machine) {
      return undefined;
    }

    return await this.updateMachine(machineId, {
      operationalStatus: "Operativa",
    });
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Stoppage Causes
  async getStoppageCauses(): Promise<StoppageCause[]> {
    return await db.select().from(stoppageCauses);
  }

  async getStoppageCause(id: number): Promise<StoppageCause | undefined> {
    const [cause] = await db.select().from(stoppageCauses).where(eq(stoppageCauses.id, id));
    return cause || undefined;
  }

  async createStoppageCause(insertCause: InsertStoppageCause): Promise<StoppageCause> {
    const [cause] = await db.insert(stoppageCauses).values(insertCause).returning();
    return cause;
  }

  async updateStoppageCause(id: number, updateData: Partial<InsertStoppageCause>): Promise<StoppageCause | undefined> {
    const [cause] = await db
      .update(stoppageCauses)
      .set(updateData)
      .where(eq(stoppageCauses.id, id))
      .returning();
    return cause || undefined;
  }

  async deleteStoppageCause(id: number): Promise<void> {
    await db.delete(stoppageCauses).where(eq(stoppageCauses.id, id));
  }

  // Technicians
  async getTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getTechnician(id: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician || undefined;
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }

  async updateTechnician(id: number, updateData: Partial<InsertTechnician>): Promise<Technician | undefined> {
    const [technician] = await db
      .update(technicians)
      .set(updateData)
      .where(eq(technicians.id, id))
      .returning();
    return technician || undefined;
  }

  async deleteTechnician(id: number): Promise<void> {
    await db.delete(technicians).where(eq(technicians.id, id));
  }

  // Failure Diagnostics
  async getFailureDiagnostics(): Promise<FailureDiagnostic[]> {
    return await db.select().from(failureDiagnostics);
  }

  async getFailureDiagnostic(id: number): Promise<FailureDiagnostic | undefined> {
    const [diagnostic] = await db.select().from(failureDiagnostics).where(eq(failureDiagnostics.id, id));
    return diagnostic || undefined;
  }

  async createFailureDiagnostic(insertDiagnostic: InsertFailureDiagnostic): Promise<FailureDiagnostic> {
    const [diagnostic] = await db.insert(failureDiagnostics).values(insertDiagnostic).returning();
    return diagnostic;
  }

  async updateFailureDiagnostic(id: number, updateData: Partial<InsertFailureDiagnostic>): Promise<FailureDiagnostic | undefined> {
    const [diagnostic] = await db
      .update(failureDiagnostics)
      .set(updateData)
      .where(eq(failureDiagnostics.id, id))
      .returning();
    return diagnostic || undefined;
  }

  async deleteFailureDiagnostic(id: number): Promise<void> {
    await db.delete(failureDiagnostics).where(eq(failureDiagnostics.id, id));
  }

  // Downtime Records with Relations
  async getDowntimeRecords(): Promise<DowntimeRecordWithRelations[]> {
    const records = await db.query.downtimeRecords.findMany({
      with: {
        machine: true,
        product: true,
        cause: true,
        technician: true,
      },
      orderBy: desc(downtimeRecords.timestampStart),
    });
    return records as DowntimeRecordWithRelations[];
  }

  async getDowntimeRecord(id: number): Promise<DowntimeRecordWithRelations | undefined> {
    const record = await db.query.downtimeRecords.findFirst({
      where: eq(downtimeRecords.id, id),
      with: {
        machine: true,
        product: true,
        cause: true,
        technician: true,
      },
    });
    return record as DowntimeRecordWithRelations | undefined;
  }

  async createDowntimeRecord(insertRecord: InsertDowntimeRecord): Promise<DowntimeRecord> {
    // Business-critical validation: verify entities exist
    const machine = await this.getMachine(insertRecord.machineId);
    if (!machine) {
      throw new Error(`Machine with ID ${insertRecord.machineId} not found`);
    }

    const cause = await this.getStoppageCause(insertRecord.causeId);
    if (!cause) {
      throw new Error(`Stoppage cause with ID ${insertRecord.causeId} not found`);
    }

    if (insertRecord.productId) {
      const product = await this.getProduct(insertRecord.productId);
      if (!product) {
        throw new Error(`Product with ID ${insertRecord.productId} not found`);
      }
    }

    // Core business logic: automatically determine maintenance requirements from cause
    const recordWithMaintenanceLogic = {
      ...insertRecord,
      requiresMaintenance: cause.requiresMaintenance,
      maintenanceStatus: cause.requiresMaintenance ? "Abierta" as const : "No Aplica" as const,
      // Ensure these fields are not set by caller
      technicianId: null,
      timestampAccepted: null,
      timestampClosed: null,
      maintenanceNotes: null,
    };

    const [record] = await db.insert(downtimeRecords).values(recordWithMaintenanceLogic).returning();
    
    // Automatically block machine if maintenance is required
    if (cause.requiresMaintenance) {
      await this.updateMachine(insertRecord.machineId, {
        operationalStatus: "Bloqueada",
      });
    } else {
      await this.updateMachine(insertRecord.machineId, {
        operationalStatus: "Parada",
      });
    }
    
    return record;
  }

  async updateDowntimeRecord(id: number, updateData: Partial<DowntimeRecord>): Promise<DowntimeRecord | undefined> {
    const [record] = await db
      .update(downtimeRecords)
      .set(updateData)
      .where(eq(downtimeRecords.id, id))
      .returning();
    return record || undefined;
  }

  // Maintenance Tickets
  async getActiveMaintenanceTickets(): Promise<DowntimeRecordWithRelations[]> {
    const tickets = await db.query.downtimeRecords.findMany({
      where: or(
        eq(downtimeRecords.maintenanceStatus, "Abierta"),
        eq(downtimeRecords.maintenanceStatus, "En Progreso")
      ),
      with: {
        machine: true,
        product: true,
        cause: true,
        technician: true,
      },
      orderBy: desc(downtimeRecords.timestampStart),
    });
    return tickets as DowntimeRecordWithRelations[];
  }

  async getHistoricalMaintenanceTickets(): Promise<DowntimeRecordWithRelations[]> {
    const tickets = await db.query.downtimeRecords.findMany({
      where: eq(downtimeRecords.requiresMaintenance, true),
      with: {
        machine: true,
        product: true,
        cause: true,
        technician: true,
      },
      orderBy: desc(downtimeRecords.timestampStart),
      limit: 100, // Limit to recent 100 for performance
    });
    return tickets as DowntimeRecordWithRelations[];
  }

  async acceptMaintenanceTicket(id: number, technicianId: number): Promise<DowntimeRecord | undefined> {
    const [record] = await db
      .update(downtimeRecords)
      .set({
        maintenanceStatus: "En Progreso",
        technicianId: technicianId,
        timestampAccepted: new Date(),
      })
      .where(eq(downtimeRecords.id, id))
      .returning();
    return record || undefined;
  }

  async closeMaintenanceTicket(id: number, notes: string): Promise<DowntimeRecord | undefined> {
    // Get the record first to access machineId
    const existingRecord = await this.getDowntimeRecord(id);
    if (!existingRecord) {
      throw new Error(`Downtime record with ID ${id} not found`);
    }

    const [record] = await db
      .update(downtimeRecords)
      .set({
        maintenanceStatus: "Cerrada",
        timestampClosed: new Date(),
        maintenanceNotes: notes || undefined,
      })
      .where(eq(downtimeRecords.id, id))
      .returning();
    
    return record || undefined;
  }

  // Production Batches
  async getProductionBatches(): Promise<ProductionBatch[]> {
    return await db.select().from(productionBatches).orderBy(desc(productionBatches.timestampStart));
  }

  async getProductionBatch(id: number): Promise<ProductionBatch | undefined> {
    const [batch] = await db.select().from(productionBatches).where(eq(productionBatches.id, id));
    return batch || undefined;
  }

  async getActiveBatchByMachine(machineId: number): Promise<ProductionBatch | undefined> {
    const [batch] = await db
      .select()
      .from(productionBatches)
      .where(
        and(
          eq(productionBatches.machineId, machineId),
          eq(productionBatches.status, "En Curso")
        )
      )
      .orderBy(desc(productionBatches.timestampStart))
      .limit(1);
    return batch || undefined;
  }

  async createProductionBatch(insertBatch: InsertProductionBatch): Promise<ProductionBatch> {
    // Check if there's already an active batch for this machine
    const activeBatch = await this.getActiveBatchByMachine(insertBatch.machineId);
    if (activeBatch) {
      throw new Error("Ya existe un lote activo para esta máquina. Finalice el lote actual antes de iniciar uno nuevo.");
    }

    const [batch] = await db.insert(productionBatches).values({
      ...insertBatch,
      status: "En Curso",
    }).returning();
    return batch;
  }

  async updateProductionBatch(id: number, updateData: Partial<ProductionBatch>): Promise<ProductionBatch | undefined> {
    const [batch] = await db
      .update(productionBatches)
      .set(updateData)
      .where(eq(productionBatches.id, id))
      .returning();
    return batch || undefined;
  }

  async finishProductionBatch(id: number, actualQuantity: number): Promise<ProductionBatch | undefined> {
    const [batch] = await db
      .update(productionBatches)
      .set({
        actualQuantity,
        timestampEnd: new Date(),
        status: "Completado",
      })
      .where(eq(productionBatches.id, id))
      .returning();
    return batch || undefined;
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  // Push Subscriptions
  async getPushSubscriptionsByUser(userId: number): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async createPushSubscription(insertSubscription: InsertPushSubscription): Promise<PushSubscription> {
    // First try to delete existing subscription with same endpoint
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, insertSubscription.endpoint));
    
    // Then create new subscription
    const [subscription] = await db.insert(pushSubscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async deletePushSubscription(id: number): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }
}

export const storage = new DatabaseStorage();
