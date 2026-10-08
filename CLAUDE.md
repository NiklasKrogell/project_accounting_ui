# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Frontend for a multi-tenant accounting SaaS ("project accounting"). React 19 + TypeScript on Create React App (react-scripts 5), talking to the backend in the sibling `project_accounting_backend` repo. Bilingual UI (Finnish primary, English fallback) via i18next.

## Commands

```bash
npm start                        # dev server on :3000 (BROWSER=none in .env, won't auto-open)
npm run build                    # production build -> build/
npm test                         # Jest in watch mode
npm test -- --watchAll=false     # run once (what CI uses)
npm test -- MyComponent          # run tests matching a name/file pattern
```

`.npmrc` sets `legacy-peer-deps=true` because react-scripts 5's peer dependency ranges predate React 19 — required for both `npm install` and CI's `npm ci` to succeed.

CI (`.github/workflows/ci.yml`, push/PR to `master`): Node 22, `npm ci` → `npm test -- --watchAll=false` → `npm run build`.

ALWAYS ASK BEFORE TESTING WITH PREVIEW!

## Architecture

### Routing
`react-router-dom` (v6 API — declarative `Routes`/`Route`/`Outlet`/`Navigate`, no loaders/actions) provides real URL paths: `/login`, `/signup` (public, gated by `src/routes/PublicOnlyRoute.tsx` which redirects to `/` if already authenticated), and `/`, `/fiscal-years` (protected, gated by `src/routes/ProtectedRoute.tsx` which redirects to `/login` if unauthenticated, wrapped in `src/routes/Layout.tsx`). Any unmatched path redirects to `/`. `BrowserRouter` lives in `src/index.tsx`, not `App.tsx` — `App.tsx` only defines the route table, which is why tests render `<App />` inside a `MemoryRouter`. `Layout.tsx` renders the `AppBar` (company switcher + logout) unconditionally, `Tabs` (Dashboard/Tilikaudet) only when the active company's subscription is `ACTIVE`, and `SubscriptionRequired` in place of the routed page content when it isn't — `SubscriptionRequired` is deliberately not its own route, since the topbar must stay visible so a multi-company user can switch to a paid one. When adding a new page, add a route in `App.tsx` rather than a new `view` state. The settings page (`/settings`, `src/pages/Settings.tsx`) is the one full-bleed page: `Layout.tsx` drops the centered 900px column for it so its side menu sits on the left edge. Each side-menu section is a child route (`/settings/general` → `src/components/Settings/GeneralSettings.tsx`, which holds the language setting); add a section to `SETTINGS_SECTIONS` in `Settings.tsx` plus a child route in `App.tsx`.

### Auth & multi-company state
`src/auth/AuthContext.tsx` is the sole source of auth/session truth, exposed via `useAuth()`. Shape: `{ loading, user, memberships, activeCompanyId, activeMembership }`, plus `login`/`signup`/`logout`/`switchCompany`. On mount it calls `GET /api/auth/me`; a failure (401) is treated as simply logged-out, not an error state. `memberships` is the list of companies the user belongs to (including inactive ones, shown with an "(inactive)" label); `switchCompany(companyId)` calls the backend to move the session's active company and refreshes local state. Role checks (`VIEWER < LEDGER < ACCOUNTANT < ADMIN`) go through `src/lib/roles.ts`'s `roleAtLeast()` against `activeMembership.role` — don't hardcode role string comparisons.

### API layer
`src/api/client.ts` is a thin fetch wrapper: base URL from `REACT_APP_API_URL` (falls back to `http://localhost:4000`), always sends `credentials: 'include'` (session cookie auth, matching the backend's cookie-based sessions — no bearer tokens), expects backend responses shaped `{ data: T, error?: { message } }`, and throws a typed `ApiError` (carries HTTP status) on non-2xx. Feature-specific endpoints are typed wrappers around this client in their own module (e.g. `src/api/fiscalYears.ts`) — follow that pattern for new endpoints rather than calling `fetch`/the raw client from components.

### i18n
`src/i18n/index.ts` configures i18next: language resolution order is explicit user choice → `localStorage['lang']` → browser language → default `'fi'`. Translation strings live in `src/i18n/locales/{fi,en}.json` — **Finnish is the primary/canonical language**, English is the fallback, so add new keys to `fi.json` first and mirror into `en.json`. Components consume strings via `useTranslation()`'s `t()`, including interpolation (e.g. `t('connected', { companyId })`).

### Types & styling
Domain types are hand-written under `src/types/` (`auth.ts`, `fiscal.ts`) mirroring backend response shapes — keep these in sync when backend DTOs change. UI is built with Material UI (`@mui/material`), using its **default theme** (`src/theme.ts`, `createTheme()` with no overrides) — no custom palette/typography, no dark mode. There's no plain CSS left in `src/` (`App.css`/`index.css` were removed once the MUI migration completed); style components via the `sx` prop rather than adding a stylesheet.
