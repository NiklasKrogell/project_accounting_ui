# MUI + React Router Migration — Design

## Context

`project_accounting_ui` is a React 19 + TypeScript app on Create React App (react-scripts 5). Today it has no component library (plain CSS in `App.css`/`index.css`, BEM-ish class names) and no router — `App.tsx` holds a `view` state variable (`'dashboard' | 'fiscalYears'`) and branches on auth state to decide what to render. Before further UI work continues, we're adopting Material UI (MUI) as the component library and React Router for real URL-based navigation, and migrating the existing pages (Login, Signup, Home, FiscalYears, SubscriptionRequired) onto both.

## Goals

- Introduce MUI as the project's component library, using its default theme (no custom branding yet — colors/typography TBD later).
- Introduce React Router with real URL paths (browser back/forward and refresh work correctly).
- Migrate all existing pages to MUI components now, not incrementally.
- Preserve the current navigation shell shape: a top `AppBar` with company switcher, language switcher, user info, logout, and a `Tabs` row below it for Dashboard / Tilikaudet.
- No dark mode support yet.

## Non-goals

- Custom theme / branding (colors, typography, border radius) — explicitly deferred.
- Dark mode.
- Replacing the table on the FiscalYears page with `DataGrid` — plain MUI `Table` is sufficient at this size.
- Any new user-facing features — this is a like-for-like migration of existing pages plus routing.

## Dependencies

Add: `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`, `react-router-dom`.

MUI v6+ supports React 19 natively. The project already sets `legacy-peer-deps=true` in `.npmrc` (required by react-scripts 5's peer ranges predating React 19), so no additional peer-dependency workarounds are expected.

## Routing

| Path | Page | Access |
|---|---|---|
| `/login` | `Login` | Public — redirects to `/` if already authenticated |
| `/signup` | `Signup` | Public — redirects to `/` if already authenticated |
| `/` | `Home` (dashboard) | Protected — requires auth + active subscription |
| `/fiscal-years` | `FiscalYears` | Protected — requires auth + active subscription |
| any other path | — | Redirects to `/` |

`SubscriptionRequired` is **not** a distinct route. It's a state gate: a protected route whose company lacks an active subscription renders `SubscriptionRequired` in place, at whatever protected path was requested, rather than redirecting to a separate URL. This matches its current role as a blocking state rather than a page a user navigates to.

### App shell structure

- `index.tsx` wraps the app in `<BrowserRouter>`, MUI's `<ThemeProvider theme={defaultTheme}>`, and `<CssBaseline>`.
- `App.tsx` keeps the `AuthProvider` wrapper and becomes route-driven: defines `<Routes>` for the table above.
- New `ProtectedRoute` component: reads `useAuth()`. While `loading`, renders nothing (or a spinner). If no `user`, renders `<Navigate to="/login" replace />`. If `activeMembership` is missing or its `subscriptionStatus !== 'ACTIVE'`, renders `<SubscriptionRequired />` directly (no redirect). Otherwise renders `<Outlet />`.
- New `Layout` component: the current topbar (company switcher, language switcher, user name, logout) implemented as MUI `AppBar` + `Toolbar`, with a `Tabs` row below it wired to `useLocation()` (to reflect the active route) and `useNavigate()` (to switch routes on click). Wraps its children via `<Outlet />`. Used as the element for the protected route subtree so both `/` and `/fiscal-years` share it.

## Component migration mapping

| Current | MUI replacement |
|---|---|
| `.card` (Login/Signup) | `Card` + `CardContent` |
| `<input>` | `TextField` |
| primary `<button>` | `Button variant="contained"` |
| `.secondary` button | `Button variant="outlined"` |
| `.danger` button | `Button color="error"` |
| `.link` button | `Button variant="text"` |
| topbar `<select>` (company/language) | `Select` + `MenuItem` |
| `.error` text | `Alert severity="error"` |
| headings/body text | `Typography` |
| `table.periods` | `TableContainer` + `Table` / `TableHead` / `TableRow` / `TableCell` |
| `.badge-open` / `.badge-closed` | `Chip color="success"` / `Chip color="error"` |
| topbar container | `AppBar` + `Toolbar` |
| tabs | `Tabs` + `Tab` |

`App.css` and `index.css` are removed once migration is complete — `CssBaseline` provides the reset, and component-level spacing uses MUI's `sx` prop / theme spacing units instead of bespoke classes.

## Testing impact

[App.test.tsx](../../../src/App.test.tsx) currently renders `<App />` directly with no router context. It needs to wrap the render in `MemoryRouter` (with an explicit `initialEntries` per test) so route-dependent behavior (redirects, active tab) can be asserted deterministically.

## Sequencing

1. Install dependencies; add `ThemeProvider` + `CssBaseline` + `BrowserRouter` at the root; wire up the route table in `App.tsx` with placeholder/unmigrated page components.
2. Build `ProtectedRoute` and `Layout`.
3. Migrate pages to MUI one at a time: Login, Signup, SubscriptionRequired, Home, FiscalYears.
4. Update `App.test.tsx` for router context; remove `App.css`/`index.css` once nothing references them.

## Open questions

None — scope, theming, dark mode, and navigation shape were confirmed during brainstorming.
