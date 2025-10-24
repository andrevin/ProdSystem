# Gestión de Paradas de Producción - PWA Industrial con Tiempo Real

## Overview

Esta es una Progressive Web App (PWA) industrial para gestión de paradas de producción en tiempo real, diseñada para tabletas y navegadores web. La aplicación implementa una arquitectura completamente reactiva donde todos los cambios se reflejan instantáneamente en las pantallas de todos los usuarios sin necesidad de refrescar.

### Usuarios del Sistema:
1. **Operadores** - Interfaz de tableta para gestionar lotes de producción y registrar paradas
2. **Técnicos de Mantenimiento** - Gestionan tickets de mantenimiento y pueden auto-asignarse trabajo
3. **Jefes de Mantenimiento** - Asignan tickets a técnicos y supervisan el flujo de trabajo
4. **Supervisores** - Monitorean todas las paradas y pueden desbloquear máquinas manualmente
5. **Administradores** - Configuran máquinas, productos, causas de parada, técnicos y documentación

## Requerimientos Arquitectónicos Fundamentales

### 1. Arquitectura Reactiva en Tiempo Real
- **Cero Refrescos**: Todas las actualizaciones (tickets, cambios de estado, asignaciones, desbloqueos) se reflejan instantáneamente en todas las pantallas sin refrescar
- **Tecnología**: WebSockets para comunicación bidireccional entre cliente y servidor
- **Estado Sincronizado**: Todos los clientes mantienen estado sincronizado en tiempo real

### 2. Progressive Web App (PWA)
- **Instalable**: Puede instalarse en pantalla de inicio de iOS/Android
- **Manifest.json**: Configuración completa con iconos y splash screen
- **Offline-First**: Operadores pueden registrar paradas sin conexión
- **Service Workers**: Cacheo de assets y sincronización automática al recuperar red
- **Background Sync**: Las acciones offline se sincronizan automáticamente

### 3. Notificaciones Push Nativas
- **Jefes de Mantenimiento**: Push inmediato cuando se crea ticket "Abierta (Sin Asignar)"
- **Técnicos**: Push general para nuevos tickets + push específico cuando se les asigna uno
- **Supervisores**: Push inmediato cada vez que cualquier máquina se detiene (operativa o avería)

## Flujos de Trabajo Principales

### Flujo de Operador (Interfaz de Tablet)
1. **Inicio de Lote**:
   - Búsqueda de producto por Nombre O SKU con filtrado en tiempo real
   - Resultados muestran ambos campos para identificación fácil
   - Ingreso de cantidad planificada

2. **Gestión de Paradas (Reactiva)**:
   - **CASO 1 - Parada Operativa**: Transición instantánea a pantalla de alerta con botón "REANUDAR PRODUCCIÓN"
   - **CASO 2 - Parada por Avería**: Bloqueo inmediato y automático (transición de estado reactiva, NO refresh)
   - Máquina bloqueada muestra "MÁQUINA BLOQUEADA POR MANTENIMIENTO" hasta que mantenimiento cierre el ticket

3. **Desbloqueo Automático**: Cuando técnico cierra ticket, la interfaz del operador se desbloquea instantáneamente vía WebSocket

### Flujo de Mantenimiento (Web/Tablet)
1. **Dashboard en Vivo**:
   - Tablero reactivo donde tickets aparecen, desaparecen o se mueven entre columnas automáticamente
   - Sin necesidad de interacción del usuario para ver actualizaciones

2. **Dual Workflow para Tickets**:
   - **Flujo A - Asignación por Jefe (Push)**: Jefe ve ticket "Sin Asignar" → presiona "Asignar" → selecciona técnico → técnico recibe notificación push
   - **Flujo B - Auto-Asignación (Pull)**: Técnico ve ticket "Sin Asignar" → presiona "Tomar Ticket" → ticket se auto-asigna → botón desaparece para otros técnicos

3. **Vista Detallada de Ticket**:
   - Información completa del ticket
   - **Biblioteca de Documentos de la Máquina**: Sección visible con lista de manuales y planos, botones para Ver/Descargar

4. **Cierre de Ticket (Reactivo)**:
   - Formulario obliga a adjuntar **Foto de Respaldo** (obligatorio)
   - Selección de **Diagnóstico de Falla** (obligatorio)
   - Al confirmar cierre: ticket → "Cerrada", máquina se desbloquea, interfaz de operador se actualiza instantáneamente vía WebSocket

### Flujo de Administración
1. **Gestión de Máquinas**:
   - Nombre de máquina
   - **Sección/Área de la Planta** (nuevo campo)
   - **Biblioteca de Documentos**: Upload de múltiples archivos con categorización (ej. "Manual Eléctrico", "Procedimiento de Seguridad")

2. **Gestión de Productos**:
   - Nombre del producto
   - **SKU** (nuevo campo) - código único de producto

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript in SPA (Single Page Application) mode

**Real-Time Communication**: WebSockets (ws library)
- Bidirectional communication for instant updates
- Event-driven architecture for state synchronization
- Automatic reconnection on network issues

**PWA Features**: 
- Service Worker for offline capability and background sync
- Web App Manifest for installability
- Push API for native notifications
- IndexedDB for offline data storage

**Routing**: Wouter (lightweight client-side routing)
- Four main routes: `/` (Operator), `/maintenance`, `/admin`, `/login`
- Authentication with Passport.js, role-based access control (IMPLEMENTED)
- Protected routes by user role

**UI Component System**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- Design system follows Material Design 3 principles for industrial environments
- Optimized for high visibility, touch targets, and quick interactions
- Custom color system with HSL CSS variables for theming
- Roboto font family for industrial readability

**State Management**: TanStack Query (React Query) + WebSocket event handlers
- Server state synchronization with automatic caching
- WebSocket events trigger query invalidations for real-time updates
- Optimistic updates for maintenance ticket operations

**Form Handling**: React Hook Form with Zod validation
- Schema validation integrated with backend Drizzle schemas via drizzle-zod
- File upload handling for photos and documents

**Build System**: Vite
- Path aliases configured: `@/` for client, `@shared/` for shared schemas
- Development with HMR, production builds to `dist/public`
- PWA plugin for service worker generation

### Backend Architecture

**Framework**: Express.js with TypeScript

**Real-Time Server**: WebSocket server (ws)
- Broadcasts state changes to all connected clients
- Room-based broadcasting (by machine, by user role)
- Connection management and authentication

**API Pattern**: RESTful HTTP endpoints + WebSocket events
- CRUD operations for: machines, products, stoppage causes, technicians, users, diagnostics, machine documents
- Specialized endpoints for downtime records and maintenance ticket workflows
- Production batch management with real-time updates
- File upload endpoints for photos and documents
- Audit logging for critical operations

**Database ORM**: Drizzle ORM
- Type-safe query builder
- Schema-first approach with TypeScript inference
- Migrations managed in `./migrations` directory

**Validation**: Zod schemas shared between frontend and backend
- Insert schemas generated from Drizzle table definitions
- Centralized in `shared/schema.ts` for consistency

**Session Management**: PostgreSQL session store (connect-pg-simple)
- Sessions persisted in database
- Passport.js local strategy for authentication
- Bcrypt password hashing

**File Storage**: Local filesystem (future: cloud storage)
- Photos stored in `/uploads/photos`
- Documents stored in `/uploads/documents`
- Organized by entity type and ID

### Data Storage

**Database**: PostgreSQL (Neon serverless)
- Connection via WebSocket for serverless compatibility
- Connection pooling with `@neondatabase/serverless`

**Core Tables**:
1. `users` - User accounts with roles (operator, technician, maintenance_chief, supervisor, admin)
2. `machines` - Production equipment with operational status, section/area, and document library
3. `products` - Items being manufactured with name and **SKU**
4. `stoppage_causes` - Configurable reasons for downtime (with maintenance flag)
5. `technicians` - **LEGACY**: Maintenance team members (kept for compatibility)
6. `production_batches` - Production lot tracking with quantities and timestamps
7. `downtime_records` - Time-stamped stoppage events with photo evidence, diagnostic classification
8. `failure_diagnostics` - Categorized failure types for root cause analysis
9. `audit_logs` - Complete audit trail for critical operations
10. `machine_documents` - **NEW**: Document library for machines with categories
11. `push_subscriptions` - **NEW**: Push notification subscriptions by user

**Key Schema Features**:
- `products.sku` - Unique product code for identification
- `machines.section` - Plant area/section for organization
- `machine_documents` - Stores file path, category, filename for each machine's documentation
- `downtime_records.photoUrl` - Required photo evidence for ticket closure
- `downtime_records.assignedToId` - Separate from acceptedBy for dual workflow (chief assigns vs tech takes)
- Enhanced maintenance workflow: Abierta (Sin Asignar) → Asignada (by chief) OR auto-assigned (tech takes) → En Progreso (accepted by tech) → Cerrada (with photo + diagnostic)
- `push_subscriptions` - Stores Push API subscription data per user for notifications

**Operator Interface (client/src/pages/operator-view.tsx)**:
- Machine configuration with passcode protection
- **No Active Batch State**: Large "INICIAR LOTE" button with product search by name/SKU
- **Active Batch State**: 
  - Displays batch info (product name, SKU, planned quantity, elapsed time)
  - Grid of stoppage cause buttons (colored, touch-optimized)
  - "FINALIZAR LOTE" button to complete batch
- **Machine Blocked State**: Red overlay "MÁQUINA BLOQUEADA POR MANTENIMIENTO"
- **Real-time updates**: WebSocket listener for machine status changes, automatic unblock when ticket closed

**Maintenance Interface (client/src/pages/maintenance-view.tsx)**:
- **Live Dashboard**: Tickets update in real-time via WebSocket
- **Dual Assignment**: "Asignar a Técnico" button (for chiefs) AND "Tomar Ticket" button (for techs)
- **Ticket Detail View**: Shows ticket info + machine document library with download links
- **Close Ticket Form**: Photo upload (required) + diagnostic selection (required)

### External Dependencies

**Database Service**: Neon Serverless PostgreSQL
- Accessed via `DATABASE_URL` environment variable
- WebSocket-based connection for edge/serverless compatibility

**UI Component Library**: Radix UI
- Unstyled, accessible component primitives
- Extensive usage: Dialog, Select, Tabs, Switch, Toast, etc.

**Styling**: Tailwind CSS
- Custom design tokens in CSS variables
- Extended configuration for industrial-optimized spacing and colors

**Font Delivery**: Google Fonts CDN
- Roboto (400, 500, 700) for primary text
- Roboto Mono for monospaced content

**Development Tools** (Replit-specific):
- `@replit/vite-plugin-runtime-error-modal` - Error overlay
- `@replit/vite-plugin-cartographer` - Development navigation
- `@replit/vite-plugin-dev-banner` - Development environment banner

**Build Tools**:
- esbuild - Server-side bundling
- Vite - Client-side bundling and dev server
- tsx - TypeScript execution for development
- vite-plugin-pwa - PWA generation and service worker

**Date Handling**: date-fns with Spanish locale (es)
- Used for timestamp formatting and relative time display

**File Upload**: multer
- Handles multipart/form-data for photo and document uploads

## Recent Changes

**2024-10-24**: Updated architecture to support real-time reactivity via WebSockets, PWA capabilities with offline-first approach, push notifications, enhanced data model with SKU, machine sections, document library, and photo uploads for ticket closure.
