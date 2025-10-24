import { db } from "./db";
import { machines, products, stoppageCauses, technicians } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Check if data already exists
    const existingMachines = await db.select().from(machines);
    if (existingMachines.length > 0) {
      console.log("✓ Database already seeded");
      return;
    }

    // Seed machines
    await db.insert(machines).values([
      { name: "Prensa 1", description: "Prensa hidráulica principal" },
      { name: "Prensa 2", description: "Prensa hidráulica secundaria" },
      { name: "Prensa 3", description: "Prensa neumática" },
      { name: "Torno CNC 1", description: "Torno de control numérico" },
      { name: "Fresadora 1", description: "Fresadora vertical" },
    ]);
    console.log("✓ Machines seeded");

    // Seed products
    await db.insert(products).values([
      { name: "Widget A100", description: "Componente estándar tipo A" },
      { name: "Widget B200", description: "Componente estándar tipo B" },
      { name: "Pieza X-500", description: "Pieza personalizada X" },
      { name: "Engranaje G45", description: "Engranaje de precisión" },
      { name: "Soporte S-12", description: "Soporte estructural" },
    ]);
    console.log("✓ Products seeded");

    // Seed stoppage causes
    await db.insert(stoppageCauses).values([
      { 
        name: "Falta de Material", 
        color: "#f59e0b", 
        requiresMaintenance: false 
      },
      { 
        name: "Cambio de Herramienta", 
        color: "#3b82f6", 
        requiresMaintenance: false 
      },
      { 
        name: "Falla Mecánica", 
        color: "#ef4444", 
        requiresMaintenance: true 
      },
      { 
        name: "Falla Eléctrica", 
        color: "#dc2626", 
        requiresMaintenance: true 
      },
      { 
        name: "Falla Hidráulica", 
        color: "#b91c1c", 
        requiresMaintenance: true 
      },
      { 
        name: "Falla Neumática", 
        color: "#991b1b", 
        requiresMaintenance: true 
      },
      { 
        name: "Ajuste de Calidad", 
        color: "#8b5cf6", 
        requiresMaintenance: false 
      },
      { 
        name: "Limpieza Programada", 
        color: "#10b981", 
        requiresMaintenance: false 
      },
    ]);
    console.log("✓ Stoppage causes seeded");

    // Seed technicians
    await db.insert(technicians).values([
      { name: "Juan Pérez", email: "juan.perez@empresa.com" },
      { name: "María González", email: "maria.gonzalez@empresa.com" },
      { name: "Carlos Rodríguez", email: "carlos.rodriguez@empresa.com" },
      { name: "Ana Martínez", email: "ana.martinez@empresa.com" },
    ]);
    console.log("✓ Technicians seeded");

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
