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
- Three main routes: `/` (Operator), `/maintenance`, `/maintenance`, `/admin`
- No authentication implemented - role-based access is UI-only

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
- CRUD operations for: machines, products, stoppage causes, technicians
- Specialized endpoints for downtime records and maintenance ticket workflows
- No authentication middleware implemented

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
1. `machines` - Production equipment registry
2. `products` - Items being manufactured
3. `stoppage_causes` - Configurable reasons for downtime (with maintenance flag)
4. `technicians` - Maintenance team members
5. `downtime_records` - Time-stamped stoppage events with maintenance lifecycle tracking

**Key Schema Features**:
- `stoppage_causes.requiresMaintenance` boolean determines automatic ticket creation
- `downtime_records` includes maintenance workflow fields: status, assigned technician, acceptance timestamp, closure timestamp, notes
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