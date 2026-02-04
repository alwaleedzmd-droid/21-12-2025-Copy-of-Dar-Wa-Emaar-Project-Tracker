# Copilot Instructions for Dar Wa Emaar Project Tracker

## Project Overview
A React/TypeScript real estate project management system for Dar Wa Emaar company with multi-role access control (ADMIN, PR_MANAGER, CONVEYANCE, TECHNICAL) supporting bilingual (Arabic/English) UI.

## Tech Stack
- **Framework**: React 19.2 + TypeScript 5
- **Build**: Vite + Vercel deployment
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI Components**: Lucide React icons, Tailwind CSS
- **State Management**: React Context (DataContext, AuthContext)
- **Features**: Excel import, real-time notifications, role-based access control

## Architecture Patterns

### Context-Based State Management
- **DataContext** ([contexts/DataContext.tsx](contexts/DataContext.tsx)): Central hub for all data (projects, users, requests, tasks)
  - Manages authentication, user sessions, and data fetching from Supabase
  - Provides fallback demo mode with hardcoded employee data (EMPLOYEES_DATA object)
  - `useData()` hook exposes: projects, technicalRequests, clearanceRequests, projectWorks, appUsers, currentUser, login, logout, refreshData
- **AuthContext** ([contexts/AuthContext.tsx](contexts/AuthContext.tsx)): Legacy auth context (consider migrating to DataContext)
- Always wrap components with DataProvider (in [App.tsx](App.tsx))

### Role-Based Access Control
- **Roles**: ADMIN | PR_MANAGER | CONVEYANCE | TECHNICAL
- **Permission Model**: [services/roleService.ts](services/roleService.ts) defines `rolePermissions` object mapping each role to fine-grained permissions (canViewProjects, canEditProjects, etc.)
- **ProtectedRoute Component**: [App.tsx#L36-L56](App.tsx#L36-L56) wraps routes with role validation; redirects unauthorized users with RTL Arabic error message
- All component visibility should check `currentUser.role` against `allowedRoles`

### Bilingual RTL/LTR Support
- **Primary Language**: Arabic (RTL) - use `dir="rtl"` on containers
- **Font**: `font-cairo` Tailwind class applied to text elements
- All UI labels, error messages, and navigation items must support both languages
- Key UI text (e.g., dashboard titles) are hardcoded in Arabic; consider i18n for future expansion

### Supabase Integration Pattern
- Client initialized in [supabaseClient.ts](supabaseClient.ts) with hardcoded credentials and localStorage-based session persistence
- Tables: projects, technical_requests, deeds_requests, project_works, profiles, notifications, users
- **Fallback Strategy**: Demo mode activates if Supabase unavailable; uses localStorage `dar_demo_session` key
- All queries go through `supabase.from()` methods in DataContext refresh cycle
- Notifications table consumed by [NotificationCenter.tsx](NotificationCenter.tsx)

### Component Organization
- **Pages/Modules**: DashboardModule, ProjectsModule, TechnicalModule, DeedsDashboard, UsersModule (each ~200-400 lines)
- **Shared Components**: Modal, NotificationBell, ProjectCard, TaskCard, LoginPage
- **Layout**: MainLayout ([layouts/MainLayout.tsx](layouts/MainLayout.tsx)) handles navigation sidebar with role-based menu items
- **Error Handling**: ErrorBoundary class component in App.tsx catches rendering errors

## Data Flow & Integration Points

1. **Project Management Flow**:
   - Projects loaded via `supabase.from('projects').select()` in DataContext.refreshData()
   - ProjectsModule ([components/ProjectsModule.tsx](components/ProjectsModule.tsx)) displays cards, manages create/edit
   - Excel import via [utils/excelHandler.ts](utils/excelHandler.ts) `parseProjectWorksExcel()` - returns ClearanceImportData[] or ProjectWorkImportData[]

2. **Technical Requests Workflow**:
   - TechnicalModule queries `technical_requests` table
   - Maps service_type to authorities using TECHNICAL_ENTITY_MAPPING in [constants.ts](constants.ts)
   - Status transitions: pending → approved → completed (app doesn't validate transition rules)

3. **Notifications System**:
   - Decoupled service [services/notificationService.ts](services/notificationService.ts) - call `notificationService.send(role, message, url)` from anywhere
   - Inserts into `notifications` table; fails silently if table missing (graceful degradation)
   - NotificationBell polls and displays unread notifications

4. **User Management**:
   - UserManagement component manages CRUD for users table
   - `createOrUpdateUser()` function in roleService handles creation with email/name/role
   - Admin-only feature; accessible via `/users` route

## Key Files & Their Responsibilities

| File | Purpose |
|------|---------|
| [App.tsx](App.tsx) | Route definitions, ProtectedRoute wrapper, error boundary |
| [types.ts](types.ts) | All TypeScript interfaces (User, ProjectSummary, TechnicalRequest, etc.) |
| [constants.ts](constants.ts) | DAR_LOGO SVG, TECHNICAL_ENTITY_MAPPING lookup table |
| [contexts/DataContext.tsx](contexts/DataContext.tsx) | **Single source of truth** - all data fetching and auth logic |
| [services/roleService.ts](services/roleService.ts) | Role definitions and permission checking |
| [utils/excelHandler.ts](utils/excelHandler.ts) | XLSX parsing for bulk imports |
| [layouts/MainLayout.tsx](layouts/MainLayout.tsx) | Navigation sidebar, role-based menu filtering |

## Development Workflows

### Build & Run
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (port 3000)
npm run build           # Build for production
npm run preview         # Preview production build locally
npm run lint            # Run ESLint on .ts/.tsx files
```

### Environment Setup
- `.env.local` must contain `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (defaults hardcoded in supabaseClient.ts)
- `GEMINI_API_KEY` for AIAssistant integration (injected into vite.config.ts)

### Testing Strategy
- No test files present; manual testing via npm run dev
- Use demo mode by setting `dar_demo_session` in localStorage: `{id: "demo-email@darwaemaar.com", email: "email@darwaemaar.com"}`
- Default demo account: adaldawsari@darwaemaar.com with password "demo"

## Common Patterns to Follow

1. **Data Fetching**: Always use `useData()` hook; avoid direct Supabase queries in components
2. **Notifications**: Import and call `notificationService.send()` after state changes (no await needed)
3. **Loading States**: Use `isDbLoading` and `isAuthLoading` booleans from DataContext
4. **Styling**: Tailwind CSS with `text-[#1B2B48]` (primary blue), RTL `dir="rtl"` on containers
5. **Error Messages**: Display in Arabic with RTL alignment; use AlertTriangle icon for visibility
6. **Excel Imports**: Use XLSX library; call `parseProjectWorksExcel()` to transform raw data before insertion

## Critical Warnings

- **No validation framework**: Status transitions, data integrity not enforced in UI logic
- **Hardcoded credentials**: Supabase keys in supabaseClient.ts - use .env.local in production
- **Silent failures**: Notification and Excel operations fail gracefully; check console for errors
- **RTL layout issues**: Some components may have text-align misalignment - test with long Arabic strings
- **Role duplication**: types.ts uses UserRole enum differently than roleService.ts - reconcile before expanding

## Useful Commands for AI Agents

- `grep -r "useData()" components/` - find all data dependencies
- `grep -r "notificationService.send" src/` - find all notification triggers
- Search files for `ADMIN`, `PR_MANAGER` to understand role-based access patterns
