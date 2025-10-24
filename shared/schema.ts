import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'operator', 'technician', 'maintenance_chief', 'supervisor', 'admin'
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Machines table
export const machines = pgTable("machines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  operationalStatus: text("operational_status").notNull().default("Operativa"), // 'Operativa', 'Bloqueada'
});

export const insertMachineSchema = createInsertSchema(machines).omit({ id: true });
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;

// Products table
export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Stoppage causes table
export const stoppageCauses = pgTable("stoppage_causes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"), // hex color for button
  requiresMaintenance: boolean("requires_maintenance").notNull().default(false),
});

export const insertStoppageCauseSchema = createInsertSchema(stoppageCauses).omit({ id: true });
export type InsertStoppageCause = z.infer<typeof insertStoppageCauseSchema>;
export type StoppageCause = typeof stoppageCauses.$inferSelect;

// Technicians table
export const technicians = pgTable("technicians", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const insertTechnicianSchema = createInsertSchema(technicians).omit({ id: true });
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

// Failure diagnostics table
export const failureDiagnostics = pgTable("failure_diagnostics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertFailureDiagnosticSchema = createInsertSchema(failureDiagnostics).omit({ id: true });
export type InsertFailureDiagnostic = z.infer<typeof insertFailureDiagnosticSchema>;
export type FailureDiagnostic = typeof failureDiagnostics.$inferSelect;

// Production batches table
export const productionBatches = pgTable("production_batches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  machineId: integer("machine_id").notNull().references(() => machines.id),
  productId: integer("product_id").notNull().references(() => products.id),
  operatorId: integer("operator_id").references(() => users.id),
  plannedQuantity: integer("planned_quantity").notNull(),
  actualQuantity: integer("actual_quantity"),
  timestampStart: timestamp("timestamp_start", { withTimezone: true }).notNull().defaultNow(),
  timestampEnd: timestamp("timestamp_end", { withTimezone: true }),
  status: text("status").notNull().default("En Curso"), // 'En Curso', 'Completado', 'Cancelado'
});

export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({ 
  id: true, 
  timestampStart: true 
});
export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;

// Downtime records table (extended)
export const downtimeRecords = pgTable("downtime_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  machineId: integer("machine_id").notNull().references(() => machines.id),
  causeId: integer("cause_id").notNull().references(() => stoppageCauses.id),
  batchId: integer("batch_id").references(() => productionBatches.id),
  timestampStart: timestamp("timestamp_start", { withTimezone: true }).notNull().defaultNow(),
  timestampEnd: timestamp("timestamp_end", { withTimezone: true }), // When production resumed
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity"),
  requiresMaintenance: boolean("requires_maintenance").notNull().default(false),
  maintenanceStatus: text("maintenance_status").notNull().default("No Aplica"), // 'No Aplica', 'Abierta (Sin Asignar)', 'Asignada', 'En Progreso', 'Cerrada'
  priority: text("priority").notNull().default("Media"), // 'Baja', 'Media', 'Alta', 'Crítica'
  assignedById: integer("assigned_by_id").references(() => users.id), // Jefe who assigned
  technicianId: integer("technician_id").references(() => users.id), // Assigned technician
  timestampAssigned: timestamp("timestamp_assigned", { withTimezone: true }), // When jefe assigned
  timestampAccepted: timestamp("timestamp_accepted", { withTimezone: true }), // When technician accepted
  timestampClosed: timestamp("timestamp_closed", { withTimezone: true }),
  maintenanceNotes: text("maintenance_notes"),
  closurePhotoUrl: text("closure_photo_url"), // Path to uploaded photo
  diagnosticId: integer("diagnostic_id").references(() => failureDiagnostics.id),
});

export const insertDowntimeRecordSchema = createInsertSchema(downtimeRecords).omit({ 
  id: true,
  timestampStart: true,
});

export type InsertDowntimeRecord = z.infer<typeof insertDowntimeRecordSchema>;
export type DowntimeRecord = typeof downtimeRecords.$inferSelect;

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  actionType: text("action_type").notNull(), // 'create_ticket', 'assign_ticket', 'close_ticket', 'unlock_machine', etc.
  entityType: text("entity_type").notNull(), // 'downtime_record', 'machine', 'batch', etc.
  entityId: integer("entity_id"),
  details: jsonb("details"), // Additional context as JSON
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ 
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  operatedBatches: many(productionBatches),
  assignedTickets: many(downtimeRecords, { relationName: "assignedTo" }),
  assignedByTickets: many(downtimeRecords, { relationName: "assignedBy" }),
  auditLogs: many(auditLogs),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
  productionBatches: many(productionBatches),
}));

export const productsRelations = relations(products, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
  productionBatches: many(productionBatches),
}));

export const stoppageCausesRelations = relations(stoppageCauses, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
}));

// Legacy technicians table kept for compatibility - no relations to new schema
export const techniciansRelations = relations(technicians, ({ many }) => ({}));

export const failureDiagnosticsRelations = relations(failureDiagnostics, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
}));

export const productionBatchesRelations = relations(productionBatches, ({ one, many }) => ({
  machine: one(machines, {
    fields: [productionBatches.machineId],
    references: [machines.id],
  }),
  product: one(products, {
    fields: [productionBatches.productId],
    references: [products.id],
  }),
  operator: one(users, {
    fields: [productionBatches.operatorId],
    references: [users.id],
  }),
  downtimeRecords: many(downtimeRecords),
}));

export const downtimeRecordsRelations = relations(downtimeRecords, ({ one }) => ({
  machine: one(machines, {
    fields: [downtimeRecords.machineId],
    references: [machines.id],
  }),
  product: one(products, {
    fields: [downtimeRecords.productId],
    references: [products.id],
  }),
  cause: one(stoppageCauses, {
    fields: [downtimeRecords.causeId],
    references: [stoppageCauses.id],
  }),
  batch: one(productionBatches, {
    fields: [downtimeRecords.batchId],
    references: [productionBatches.id],
  }),
  technician: one(users, {
    relationName: "assignedTo",
    fields: [downtimeRecords.technicianId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    relationName: "assignedBy",
    fields: [downtimeRecords.assignedById],
    references: [users.id],
  }),
  diagnostic: one(failureDiagnostics, {
    fields: [downtimeRecords.diagnosticId],
    references: [failureDiagnostics.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Extended types with relations for frontend use
export type DowntimeRecordWithRelations = DowntimeRecord & {
  machine: Machine;
  product: Product | null;
  cause: StoppageCause;
  batch: ProductionBatch | null;
  technician: User | null;
  assignedBy: User | null;
  diagnostic: FailureDiagnostic | null;
};

export type ProductionBatchWithRelations = ProductionBatch & {
  machine: Machine;
  product: Product;
  operator: User | null;
};

export type AuditLogWithRelations = AuditLog & {
  user: User | null;
};
