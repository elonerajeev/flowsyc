# Project Context

## Product
- Internal CRM frontend for company operations.
- Current scope is frontend-first. Backend integration comes later.

## Stack
- React 18 with Vite
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI
- React Router
- TanStack React Query
- Framer Motion
- Recharts

## UI Structure
- Icon-only master sidebar for top-level modules.
- Detail sidebar for section pages.
- Top navbar for search, role switching, theme switching, and notifications.
- Route-level access guard for protected sections.

## RBAC
- Roles: `admin`, `manager`, `employee`, `client`
- Frontend hides or disables unauthorized actions.
- Backend is still the future source of truth for authorization.

## Persistence
- Shared local preference storage lives in `src/lib/preferences.ts`.
- Used for theme state, sidebar width, pinned lists, notes, and daily focus.

## Dynamic Frontend Behavior
- Dashboard uses daily-seeded data plus user-added focus items.
- Team, attendance, clients, tasks, projects, and notes support pinning, ordering, or local edits.
- Attendance is derived from available team members in the frontend.

## Performance
- Dashboard charts are split into a lazy-loaded module.
- Vendor chunks are manually split in `vite.config.ts`.

## Important Paths
- App shell: `src/App.tsx`
- Layout: `src/components/layout/`
- Shared preferences: `src/lib/preferences.ts`
- CRM hooks: `src/hooks/use-crm-data.ts`
- Mock/data service layer: `src/services/crm.ts`

## Notes For Backend Phase
- Keep API calls behind `src/services/*` and hooks.
- Replace localStorage-backed preferences with API-backed user settings later.
- Preserve route names and data models to reduce migration work.
