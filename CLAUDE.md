# VeriOps Frontend

React/TypeScript frontend for **VeriOps** — an agent observability and monitorability platform. Provides dashboards for runs, policies, projects, memberships, and API key management.

## Tech Stack

- **React 18** + **TypeScript** + **Vite 6** (SWC)
- **React Router 6** for routing
- **Zustand** for global client state, **TanStack Query** for server state
- **Radix UI** + **Tailwind CSS** + **CVA** for UI
- **Vitest** + **Chai** for testing
- Dev server: `localhost:3000`, proxies `/api/*` → backend

## Commands

```bash
npm run dev      # start dev server (port 3000)
npm run build    # production build → /build
npm test         # vitest run (all *.test.ts files)
```

## Project Layout

```
src/
  App.tsx                  # root router + layout
  lib/
    api.ts                 # all API calls (apiFetch + normalization helpers)
    auth.ts                # auth state, token lifecycle, session management
    routeGuards.ts         # membership/permission guard logic
    membershipAccess.ts    # access-level helpers
  store/
    appStore.ts            # Zustand: selectedProjectId, dateRange (persisted to localStorage)
  components/
    auth/                  # login, bootstrap, Google OAuth, session manager, route guards
    layout/                # Sidebar + TopBar navigation
    overview/              # Dashboard
    runs/                  # Run list + detail
    policies/              # Policy management (project-admin guarded)
    projects/              # Project list + detail
    memberships/           # Org + project membership management
    apiKeys/               # Project API key management
    settings/              # User + project settings
    ingest/                # Event ingestion
    ui/                    # ~50 reusable Radix-based components
```

## Auth System

Auth lives entirely in `src/lib/auth.ts` — a module-level external store (no React context).

- Supports **JWT tokens** (stored in-memory + refresh token in `localStorage`) and **cookie sessions**
- `AuthSessionManager` component handles `initializeAuth()` on mount and schedules auto-refresh 60s before expiry
- `useAuthSession()` hook — read auth state anywhere
- `withAuthRetry()` — wraps fetch calls with 401 → refresh → retry
- `AdminRouteGuard` — checks both auth + org/project membership before rendering admin routes
- Test utilities exported as `__authTestUtils`

## API Layer

All backend calls go through `apiFetch<T>()` in `src/lib/api.ts`:
- Base URL from `VITE_API_BASE_URL` env var (falls back to `""`)
- Static API key via `VITE_VERIOPS_API_KEY`
- Response normalization functions (`normalizeProjects`, `normalizeRunsResponse`, etc.) handle field-name variations from the backend
- All mutating calls use `withAuthRetry` for automatic token refresh

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL |
| `VITE_AUTH_SERVER_BASE_URL` | Auth server (defaults to API base URL) |
| `VITE_VERIOPS_API_KEY` | Static API key header |
| `VITE_GOOGLE_CALLBACK_MODE` | Set to `json` for token-based Google OAuth |

## Testing Patterns

- Tests are `.test.ts` files (not `.test.tsx`) — no jsdom, Node environment
- Mock `localStorage` and `fetch` manually (no testing library helpers)
- Use `__authTestUtils` from `src/lib/auth.ts` for auth state setup in tests
- Chai for assertions (`expect(x).to.equal(y)`)

## Path Alias

`@/` maps to `src/` — use it for all internal imports.
