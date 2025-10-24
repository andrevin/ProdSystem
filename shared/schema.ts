import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Machines table
export const machines = pgTable("machines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
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

// Downtime records table
export const downtimeRecords = pgTable("downtime_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  machineId: integer("machine_id").notNull().references(() => machines.id),
  causeId: integer("cause_id").notNull().references(() => stoppageCauses.id),
  timestampStart: timestamp("timestamp_start", { withTimezone: true }).notNull().defaultNow(),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity"),
  requiresMaintenance: boolean("requires_maintenance").notNull().default(false),
  maintenanceStatus: text("maintenance_status").notNull().default("No Aplica"), // 'No Aplica', 'Abierta', 'En Progreso', 'Cerrada'
  technicianId: integer("technician_id").references(() => technicians.id),
  timestampAccepted: timestamp("timestamp_accepted", { withTimezone: true }),
  timestampClosed: timestamp("timestamp_closed", { withTimezone: true }),
  maintenanceNotes: text("maintenance_notes"),
});

export const insertDowntimeRecordSchema = createInsertSchema(downtimeRecords).omit({ 
  id: true,
  timestampStart: true,
});

export type InsertDowntimeRecord = z.infer<typeof insertDowntimeRecordSchema>;
export type DowntimeRecord = typeof downtimeRecords.$inferSelect;

// Relations
export const machinesRelations = relations(machines, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
}));

export const productsRelations = relations(products, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
}));

export const stoppageCausesRelations = relations(stoppageCauses, ({ many }) => ({
  downtimeRecords: many(downtimeRecords),
}));

export const techniciansRelations = relations(technicians, ({ many }) => ({
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
  technician: one(technicians, {
    fields: [downtimeRecords.technicianId],
    references: [technicians.id],
  }),
}));

// Extended types with relations for frontend use
export type DowntimeRecordWithRelations = DowntimeRecord & {
  machine: Machine;
  product: Product | null;
  cause: StoppageCause;
  technician: Technician | null;
};
