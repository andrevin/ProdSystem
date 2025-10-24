# Gestión de Paradas de Producción

## Overview

This is an industrial production downtime management system designed for both tablet and web interfaces. The application serves three primary user roles:

1. **Operators** - Use tablet interface to instantly log production stoppages with a single tap
2. **Maintenance Technicians** - Manage maintenance tickets created from equipment failures
3. **Administrators** - Configure machines, products, stoppage causes, and technicians

The system automatically creates maintenance tickets when operators report specific types of stoppages (configured as requiring maintenance), enabling efficient tracking of the complete lifecycle from incident report to resolution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript in SPA (Single Page Application) mode

**Routing**: Wouter (lightweight client-side routing)
- Three main routes: `/` (Operator), `/maintenance`, `/admin`
- **IN DEVELOPMENT**: Authentication with Passport.js, role-based access control

**UI Component System**: shadcn/ui (Radix UI primitives + Tailwind CSS)
- Design system follows Material Design 3 principles for industrial environments
- Optimized for high visibility, touch targets, and quick interactions
- Custom color system with HSL CSS variables for theming
- Roboto font family for industrial readability

**State Management**: TanStack Query (React Query)
- Server state synchronization with automatic caching
- No global client state management (Redux/Zustand) needed
- Optimistic updates for maintenance ticket operations

**Form Handling**: React Hook Form with Zod validation
- Schema validation integrated with backend Drizzle schemas via drizzle-zod

**Build System**: Vite
- Path aliases configured: `@/` for client, `@shared/` for shared schemas
- Development with HMR, production builds to `dist/public`

### Backend Architecture

**Framework**: Express.js with TypeScript

**API Pattern**: RESTful HTTP endpoints
- CRUD operations for: machines, products, stoppage causes, technicians, users, diagnostics
- Specialized endpoints for downtime records and maintenance ticket workflows
- Production batch management
- Audit logging for critical operations
- **IN DEVELOPMENT**: Authentication middleware with Passport.js

**Database ORM**: Drizzle ORM
- Type-safe query builder
- Schema-first approach with TypeScript inference
- Migrations managed in `./migrations` directory

**Validation**: Zod schemas shared between frontend and backend
- Insert schemas generated from Drizzle table definitions
- Centralized in `shared/schema.ts` for consistency

**Session Management**: PostgreSQL session store (connect-pg-simple)
- Sessions persisted in database (though authentication not yet implemented)

### Data Storage

**Database**: PostgreSQL (Neon serverless)
- Connection via WebSocket for serverless compatibility
- Connection pooling with `@neondatabase/serverless`

**Core Tables**:
1. `users` - **NEW**: User accounts with roles (operator, technician, maintenance_chief, supervisor, admin)
2. `machines` - Production equipment registry with operational status (Operativa/Bloqueada)
3. `products` - Items being manufactured
4. `stoppage_causes` - Configurable reasons for downtime (with maintenance flag)
5. `technicians` - **LEGACY**: Maintenance team members (kept for compatibility)
6. `production_batches` - **NEW**: Production lot tracking with quantities and timestamps
7. `downtime_records` - Time-stamped stoppage events with extended maintenance lifecycle
8. `failure_diagnostics` - **NEW**: Categorized failure types for root cause analysis
9. `audit_logs` - **NEW**: Complete audit trail for critical operations

**Key Schema Features**:
- `users.role` determines access permissions and workflow capabilities
- `machines.operationalStatus` enables automatic blocking when maintenance required
- `production_batches` track complete lot lifecycle from start to completion
- `downtime_records` now includes: batch association, priority levels, assignment tracking (separate from acceptance), photo evidence, diagnostic classification
- `audit_logs` capture all critical actions with user context and JSON details
- Enhanced maintenance workflow: Abierta (Sin Asignar) → Asignada (by chief) → En Progreso (accepted by tech) → Cerrada (with photo + diagnostic)
- All relations defined with Drizzle ORM relations for type-safe joins

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

**Date Handling**: date-fns with Spanish locale (es)
- Used for timestamp formatting and relative time display