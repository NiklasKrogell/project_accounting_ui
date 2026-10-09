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
`react-router-dom` (v6 API — declarative `Routes`/`Route`/`Outlet`/`Navigate`, no loaders/actions) provides real URL paths: `/login`, `/signup` (public, gated by `src/routes/PublicOnlyRoute.tsx` which redirects to `/` if already authenticated), and `/`, `/fiscal-years` (protected, gated by `src/routes/ProtectedRoute.tsx` which redirects to `/login` if unauthenticated, wrapped in `src/routes/Layout.tsx`). Any unmatched path redirects to `/`. `BrowserRouter` lives in `src/index.tsx`, not `App.tsx` — `App.tsx` only defines the route table, which is why tests render `<App />` inside a `MemoryRouter`. `Layout.tsx` renders the `AppBar` (company switcher + logout) unconditionally, `Tabs` (Dashboard/Tilikaudet) only when the active company's subscription is `ACTIVE`, and `SubscriptionRequired` in place of the routed page content when it isn't — `SubscriptionRequired` is deliberately not its own route, since the topbar must stay visible so a multi-company user can switch to a paid one. When adding a new page, add a route in `App.tsx` rather than a new `view` state. The settings page (`/settings`, `src/pages/Settings.tsx`) is the one full-bleed page: `Layout.tsx` drops the centered 900px column for it so its side menu sits on the left edge (see **Settings** below).

### Auth & multi-company state
`src/auth/AuthContext.tsx` is the sole source of auth/session truth, exposed via `useAuth()`. Shape: `{ loading, user, settings, memberships, activeCompanyId, activeMembership }`, plus `login`/`signup`/`logout`/`switchCompany`/`updateUserSettings`. `settings` are the user's personal settings (null while logged out). On mount it calls `GET /api/auth/me`; a failure (401) is treated as simply logged-out, not an error state. `memberships` is the list of companies the user belongs to (including inactive ones, shown with an "(inactive)" label); `switchCompany(companyId)` calls the backend to move the session's active company and refreshes local state. Role checks (`VIEWER < LEDGER < ACCOUNTANT < ADMIN`) go through `src/lib/roles.ts`'s `roleAtLeast()` against `activeMembership.role` — don't hardcode role string comparisons.

### Settings
Settings come in two kinds, and the side menu groups its sections by them (`scope` in `SETTINGS_SECTIONS`, `src/pages/Settings.tsx`):

- **User settings** (`/settings/user/*`, components in `src/components/Settings/User/`) belong to the logged-in user and follow them into every company — currently only the language. They arrive with `/api/auth/me`, live in `useAuth().settings`, and are saved with `useAuth().updateUserSettings(patch)` (`PATCH /api/settings/user`), which also applies them to the running app. Don't call `userSettingsApi.update` from a component directly, or the app won't pick the change up.
- **Company settings** (`/settings/company/*`, components in `src/components/Settings/Company/`) belong to the active company only — currently the VAT settings: whether the company is VAT-registered (`companySettingsApi`, `GET`/`PATCH /api/settings/company`, `ACCOUNTANT`+ changes) and its two VAT accounts (`chartOfAccountsApi`, `LEDGER`+ changes). A company section loads from a company-scoped endpoint, **reloads when `activeMembership.companyId` changes** (with a stale-response guard), and mirrors the backend's role check to go read-only. Company settings are not kept in `AuthContext`: a component that depends on one fetches it itself (the journal entry dialog reads `vatRegistered` each time it opens and disables its VAT controls when it is off; the chart of accounts page reads it to grey out the accounts' default VAT rates). An account's default VAT rate (`Account.defaultVatRate`, one of `VAT_RATES` in `src/lib/vat.ts` or null) is set in the account edit dialog and prefills a journal entry line's rate when the account is picked — only for a VAT-registered company; otherwise the stored default is kept but left off the lines.

- **Bank settings** (`/settings/company/bank`, `BankSettings.tsx`) are a company section too — currently the company's bank accounts (`bankAccountsApi`, `/api/bank-accounts`, `LEDGER`+ manages): a name, an IBAN and the accounting account its transactions are booked on. A bank account is never deleted, only taken out of use and back (`isActive`, sent through the same `PUT`). The IBAN is checked in the dialog with `src/lib/iban.ts`, which mirrors the backend's `src/lib/iban.ts` — change both together. The account picker offers only the accounts whose group has the balance sheet item `CASH_AND_BANK` ("Rahat ja pankkisaamiset"), plus the one already linked; the backend does not enforce this. Further bank settings go on the same page as cards of their own.

A section of fields is wrapped in `SettingsSection` (`src/components/Settings/SettingsSection.tsx`), which owns the Save button, the saving/saved/error states and the read-only note: fields edit a draft and nothing is applied until Save. A section that is a list managed row by row (the bank accounts) doesn't fit that model and isn't built on it: each add, edit and removal is saved at once through a dialog or row action and the list reloaded, as on the cost centers page. To add a section: an entry in `SETTINGS_SECTIONS`, a child route in `App.tsx`, and a component built on `SettingsSection` (or, for a list, following `BankSettings`). Decide the scope by whether the setting describes the person or the company's books; the backend `CLAUDE.md` has the matching rule for where it is stored.

### API layer
`src/api/client.ts` is a thin fetch wrapper: base URL from `REACT_APP_API_URL` (falls back to `http://localhost:4000`), always sends `credentials: 'include'` (session cookie auth, matching the backend's cookie-based sessions — no bearer tokens), expects backend responses shaped `{ data: T, error?: { message } }`, and throws a typed `ApiError` (carries HTTP status) on non-2xx. Feature-specific endpoints are typed wrappers around this client in their own module (e.g. `src/api/fiscalYears.ts`) — follow that pattern for new endpoints rather than calling `fetch`/the raw client from components.

### i18n
`src/i18n/index.ts` configures i18next. The language is a user setting stored on the backend: once logged in, `AuthContext` applies `settings.language` through `changeLanguage()`, which also caches it in `localStorage['lang']`. That cache is all the logged-out pages and the first paint have to go on (falling back to the default `'fi'`); there is no language control outside the settings page. Translation strings live in `src/i18n/locales/{fi,en}.json` — **Finnish is the primary/canonical language**, English is the fallback, so add new keys to `fi.json` first and mirror into `en.json`. Components consume strings via `useTranslation()`'s `t()`, including interpolation (e.g. `t('connected', { companyId })`).

### Types & styling
Domain types are hand-written under `src/types/` (`auth.ts`, `fiscal.ts`) mirroring backend response shapes — keep these in sync when backend DTOs change. UI is built with Material UI (`@mui/material`), using its **default theme** (`src/theme.ts`, `createTheme()` with no overrides) — no custom palette/typography, no dark mode. There's no plain CSS left in `src/` (`App.css`/`index.css` were removed once the MUI migration completed); style components via the `sx` prop rather than adding a stylesheet.
