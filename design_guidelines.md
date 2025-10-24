# Design Guidelines: Gestión de Paradas de Producción

## Design Approach

**Selected Approach:** Design System - Material Design 3

**Justification:** This is a utility-focused industrial application where efficiency, learnability, and reliability are paramount. Material Design 3 provides:
- Robust touch-optimized components for tablet interfaces
- Clear visual feedback systems essential for industrial environments
- Excellent responsive patterns for web and tablet experiences
- Strong accessibility foundations critical for operational software

**Key Design Principles:**
1. **Speed First:** Every interaction optimized for minimal friction
2. **High Visibility:** All elements designed for readability in various lighting conditions
3. **Clear Feedback:** Immediate visual confirmation for every action
4. **Role-Based Clarity:** Distinct visual hierarchies for operator, maintenance, and admin interfaces

## Core Design Elements

### Typography

**Font Family:** Roboto (via Google Fonts CDN)
- Primary: Roboto Regular (400)
- Emphasis: Roboto Medium (500)
- Headers: Roboto Bold (700)

**Hierarchy:**
- Page Titles: 2.5rem (40px), Bold
- Section Headers: 1.75rem (28px), Medium
- Card Titles: 1.25rem (20px), Medium
- Body Text: 1rem (16px), Regular
- Supporting Text: 0.875rem (14px), Regular
- Button Labels (Operator): 1.5rem (24px), Medium
- Button Labels (Standard): 1rem (16px), Medium

### Layout System

**Spacing Scale:** Tailwind units 2, 4, 6, 8, 12, 16, 24
- Tight spacing: 2, 4 (within components)
- Standard spacing: 6, 8 (between related elements)
- Section spacing: 12, 16, 24 (between sections/cards)

**Grid System:**
- Operator Interface: Single column with full-width elements
- Maintenance Dashboard: 12-column grid for flexible layouts
- Admin Panel: 12-column grid with sidebar navigation

**Container Widths:**
- Operator Interface: Full width (max 100%)
- Maintenance Dashboard: max-w-7xl
- Admin Panel: max-w-7xl with fixed sidebar

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Component Library

### Operator Interface (Tablet-Optimized)

**Machine Configuration Banner:**
- Full-width sticky header
- Displays current machine, product, and quantity
- Minimum height: 80px
- Clear visual separation from action area

**Action Buttons (Cause of Downtime):**
- Minimum size: 140px x 140px (tablet), can be larger
- Grid layout: 2 columns on tablet portrait, 3-4 columns on landscape
- Gap between buttons: 16px
- Rounded corners: 12px
- Elevated appearance with shadow
- Icon size within button: 48px x 48px
- Label centered below icon
- Touch ripple effect on press
- Success state: Brief color transition with checkmark overlay

**Product/Quantity Selectors:**
- Large dropdown/select components
- Minimum height: 64px
- Clear labels above each selector
- Spacing between: 16px

### Maintenance Dashboard

**Ticket Cards:**
- Card elevation: subtle shadow
- Padding: 16px
- Border radius: 8px
- Vertical spacing between cards: 12px
- Status indicator: Bold colored pill on top-right
- Machine name: Prominent, 1.25rem
- Timestamp: Relative format ("2 minutes ago")
- Action buttons: Elevated, minimum 48px height

**Status Pills:**
- Height: 32px
- Padding: 6px 16px
- Border radius: 16px (fully rounded)
- Font size: 0.875rem, Medium weight

**Ticket Detail Modal/Panel:**
- Width: 600px (desktop), full-width (mobile)
- Padding: 24px
- Information sections with 16px spacing
- Action buttons at bottom: 48px height, 12px gap between

**List View:**
- Row height: minimum 72px
- Zebra striping for readability
- Hover state with elevated appearance
- Clear column headers with sort indicators

### Admin Panel

**Sidebar Navigation:**
- Fixed width: 240px (desktop)
- Collapsible on tablet
- Menu items: 48px height
- Active state: Bold with background highlight
- Icons: 24px, aligned left with 12px padding

**Management Tables:**
- Responsive table with horizontal scroll on mobile
- Row height: 56px
- Action buttons (edit/delete): Icon buttons, 40px x 40px
- Header: Sticky, medium weight text

**Forms:**
- Input fields: 56px height
- Labels: Above inputs, 0.875rem, Medium
- Field spacing: 16px vertical
- Checkbox/Switch for "Requires Maintenance": Large, 24px x 24px toggle
- Submit buttons: 48px height, full-width on mobile

**Configuration Cards:**
- Card-based layout for machine/product/cause management
- Each card: 16px padding, 8px border radius
- Add new button: Elevated, positioned top-right
- Grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

## Navigation Patterns

**Operator Interface:**
- No traditional navigation (single-purpose screen)
- Settings icon (top-right) for protected machine configuration
- Modal overlay for settings with passcode protection

**Maintenance Dashboard:**
- Top app bar with tabs: "Active Tickets" | "History"
- Filter dropdown in app bar
- No sidebar needed

**Admin Panel:**
- Persistent sidebar navigation (desktop)
- Hamburger menu with drawer (tablet/mobile)
- Sections: Dashboard | Machines | Products | Causes | Users

## Forms & Data Entry

**Input Fields:**
- Outlined style with label animation
- Helper text below field (when needed)
- Error states with clear messaging below field
- Consistent 56px height

**Dropdowns/Selects:**
- Material-style select with bottom border
- Clear dropdown indicator
- Options list with 48px item height

**Checkboxes/Switches:**
- Minimum touch target: 48px x 48px
- Label to the right with 12px spacing
- Switch preferred for binary states (like "Requires Maintenance")

## Feedback & States

**Loading States:**
- Circular progress indicator (48px diameter)
- Centered in container
- Skeleton screens for list/table loading

**Success Confirmation:**
- Toast notification (bottom-center on mobile, top-right on desktop)
- Auto-dismiss after 3 seconds
- Checkmark icon with success message

**Error States:**
- Toast for system errors
- Inline validation for form errors
- Error icon with descriptive text

**Empty States:**
- Icon (96px) + heading + description
- Centered in container
- Call-to-action button when applicable

## Animations

**Minimal Animation Strategy:**
- Button ripple effects on touch/click
- Smooth state transitions (200ms ease)
- Modal/drawer slide-in (300ms ease-out)
- No decorative animations
- Focus on functional feedback only

## Images

**No hero images or marketing visuals required.** This is a functional application.

**Icons Only:**
- Use Material Icons via CDN
- Sizes: 24px (standard UI), 48px (operator buttons), 96px (empty states)
- Consistent icon style throughout

## Accessibility

- Minimum touch target: 48px x 48px throughout
- Operator buttons: Larger targets (140px+)
- Clear focus indicators on all interactive elements
- Sufficient contrast for text readability
- Form labels properly associated with inputs
- Error messages linked to form fields
- Keyboard navigation support (admin and maintenance interfaces)