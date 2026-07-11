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

## Architecture

### No router — state-driven navigation
There is no React Router. `src/App.tsx` is the single shell: it holds a `view` state variable (`'dashboard' | 'fiscalYears'`) and conditionally renders pages directly rather than mapping URLs to routes. The same component also branches on auth state: unauthenticated → `Login`/`Signup`, authenticated but company not subscribed → `SubscriptionRequired`, otherwise → the tabbed `Home`/`FiscalYears` views inside a topbar (company switcher + language switcher + tab nav). When adding a new page, wire it into this state machine in `App.tsx` rather than reaching for a router.

### Auth & multi-company state
`src/auth/AuthContext.tsx` is the sole source of auth/session truth, exposed via `useAuth()`. Shape: `{ loading, user, memberships, activeCompanyId, activeMembership }`, plus `login`/`signup`/`logout`/`switchCompany`. On mount it calls `GET /api/auth/me`; a failure (401) is treated as simply logged-out, not an error state. `memberships` is the list of companies the user belongs to (including inactive ones, shown with an "(inactive)" label); `switchCompany(companyId)` calls the backend to move the session's active company and refreshes local state. Role checks (`VIEWER < LEDGER < ACCOUNTANT < ADMIN`) go through `src/lib/roles.ts`'s `roleAtLeast()` against `activeMembership.role` — don't hardcode role string comparisons.

### API layer
`src/api/client.ts` is a thin fetch wrapper: base URL from `REACT_APP_API_URL` (falls back to `http://localhost:4000`), always sends `credentials: 'include'` (session cookie auth, matching the backend's cookie-based sessions — no bearer tokens), expects backend responses shaped `{ data: T, error?: { message } }`, and throws a typed `ApiError` (carries HTTP status) on non-2xx. Feature-specific endpoints are typed wrappers around this client in their own module (e.g. `src/api/fiscalYears.ts`) — follow that pattern for new endpoints rather than calling `fetch`/the raw client from components.

### i18n
`src/i18n/index.ts` configures i18next: language resolution order is explicit user choice → `localStorage['lang']` → browser language → default `'fi'`. Translation strings live in `src/i18n/locales/{fi,en}.json` — **Finnish is the primary/canonical language**, English is the fallback, so add new keys to `fi.json` first and mirror into `en.json`. Components consume strings via `useTranslation()`'s `t()`, including interpolation (e.g. `t('connected', { companyId })`).

### Types & styling
Domain types are hand-written under `src/types/` (`auth.ts`, `fiscal.ts`) mirroring backend response shapes — keep these in sync when backend DTOs change. There's no CSS-in-JS or utility framework; styling is plain CSS in `App.css`/`index.css` with BEM-ish class names (`.topbar`, `.tabs`, `.tab.active`). There's also no component library — build UI from plain elements consistent with the existing pages.
