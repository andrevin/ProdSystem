import { db } from "./db";
import { machines, products, stoppageCauses, technicians, users, failureDiagnostics } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Seed users if they don't exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash("password123", 10);
    await db.insert(users).values([
      { 
        name: "Admin Usuario", 
        email: "admin@empresa.com", 
        passwordHash: hashedPassword,
        role: "admin",
        phone: "+56912345678"
      },
      { 
        name: "Supervisor García", 
        email: "supervisor@empresa.com", 
        passwordHash: hashedPassword,
        role: "supervisor",
        phone: "+56912345679"
      },
      { 
        name: "Jefe Mantenimiento López", 
        email: "jefe@empresa.com", 
        passwordHash: hashedPassword,
        role: "maintenance_chief",
        phone: "+56912345680"
      },
      { 
        name: "Técnico Juan Pérez", 
        email: "juan.perez@empresa.com", 
        passwordHash: hashedPassword,
        role: "technician",
        phone: "+56912345681"
      },
      { 
        name: "Técnico María González", 
        email: "maria.gonzalez@empresa.com", 
        passwordHash: hashedPassword,
        role: "technician",
        phone: "+56912345682"
      },
      { 
        name: "Técnico Carlos Rodríguez", 
        email: "carlos.rodriguez@empresa.com", 
        passwordHash: hashedPassword,
        role: "technician",
        phone: "+56912345683"
      },
      { 
        name: "Técnico Ana Martínez", 
        email: "ana.martinez@empresa.com", 
        passwordHash: hashedPassword,
        role: "technician",
        phone: "+56912345684"
      },
      { 
        name: "Operador Pedro Sánchez", 
        email: "pedro.sanchez@empresa.com", 
        passwordHash: hashedPassword,
        role: "operator",
        phone: "+56912345685"
      },
      { 
        name: "Operador Laura Torres", 
        email: "laura.torres@empresa.com", 
        passwordHash: hashedPassword,
        role: "operator",
        phone: "+56912345686"
      },
    ]);
      console.log("✓ Users seeded");
    } else {
      console.log("✓ Users already seeded");
    }

    // Seed machines if they don't exist
    const existingMachines = await db.select().from(machines);
    if (existingMachines.length === 0) {
      await db.insert(machines).values([
      { name: "Prensa 1", description: "Prensa hidráulica principal", operationalStatus: "Operativa" },
      { name: "Prensa 2", description: "Prensa hidráulica secundaria", operationalStatus: "Operativa" },
      { name: "Prensa 3", description: "Prensa neumática", operationalStatus: "Operativa" },
      { name: "Torno CNC 1", description: "Torno de control numérico", operationalStatus: "Operativa" },
      { name: "Fresadora 1", description: "Fresadora vertical", operationalStatus: "Operativa" },
      ]);
      console.log("✓ Machines seeded");
    } else {
      console.log("✓ Machines already seeded");
    }

    // Seed products if they don't exist
    const existingProducts = await db.select().from(products);
    if (existingProducts.length === 0) {
      await db.insert(products).values([
      { name: "Widget A100", description: "Componente estándar tipo A" },
      { name: "Widget B200", description: "Componente estándar tipo B" },
      { name: "Pieza X-500", description: "Pieza personalizada X" },
      { name: "Engranaje G45", description: "Engranaje de precisión" },
      { name: "Soporte S-12", description: "Soporte estructural" },
      ]);
      console.log("✓ Products seeded");
    } else {
      console.log("✓ Products already seeded");
    }

    // Seed stoppage causes if they don't exist
    const existingCauses = await db.select().from(stoppageCauses);
    if (existingCauses.length === 0) {
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
    } else {
      console.log("✓ Stoppage causes already seeded");
    }

    // Seed technicians if they don't exist (keeping for compatibility)
    const existingTechnicians = await db.select().from(technicians);
    if (existingTechnicians.length === 0) {
      await db.insert(technicians).values([
      { name: "Juan Pérez", email: "juan.perez@empresa.com" },
      { name: "María González", email: "maria.gonzalez@empresa.com" },
      { name: "Carlos Rodríguez", email: "carlos.rodriguez@empresa.com" },
      { name: "Ana Martínez", email: "ana.martinez@empresa.com" },
      ]);
      console.log("✓ Technicians seeded");
    } else {
      console.log("✓ Technicians already seeded");
    }

    // Seed failure diagnostics if they don't exist
    const existingDiagnostics = await db.select().from(failureDiagnostics);
    if (existingDiagnostics.length === 0) {
      await db.insert(failureDiagnostics).values([
      { name: "Rotura de componente", description: "Componente mecánico roto o dañado" },
      { name: "Desgaste excesivo", description: "Desgaste fuera de tolerancia" },
      { name: "Sobrecalentamiento", description: "Temperatura excesiva del equipo" },
      { name: "Falla eléctrica", description: "Problemas en sistema eléctrico" },
      { name: "Fuga de fluido", description: "Pérdida de aceite o fluido hidráulico" },
      { name: "Desajuste", description: "Configuración o calibración incorrecta" },
      { name: "Obstrucción", description: "Bloqueo en el sistema" },
      { name: "Sensor defectuoso", description: "Falla en sensores o instrumentación" },
      { name: "Desgaste normal", description: "Desgaste esperado por uso" },
      { name: "Falta de lubricación", description: "Lubricación insuficiente" },
      ]);
      console.log("✓ Failure diagnostics seeded");
    } else {
      console.log("✓ Failure diagnostics already seeded");
    }

    console.log("✅ Database seeding completed successfully!");
    console.log("\n📝 Login credentials for all users:");
    console.log("   Email: admin@empresa.com | Password: password123 | Role: Admin");
    console.log("   Email: supervisor@empresa.com | Password: password123 | Role: Supervisor");
    console.log("   Email: jefe@empresa.com | Password: password123 | Role: Jefe de Mantenimiento");
    console.log("   Email: juan.perez@empresa.com | Password: password123 | Role: Técnico");
    console.log("   Email: pedro.sanchez@empresa.com | Password: password123 | Role: Operador");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
