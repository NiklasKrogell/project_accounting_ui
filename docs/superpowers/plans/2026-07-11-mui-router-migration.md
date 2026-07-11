# MUI + React Router Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt Material UI (default theme) as the component library and React Router (real URL paths) as the navigation mechanism in `project_accounting_ui`, migrating all five existing pages onto both.

**Architecture:** `BrowserRouter` + MUI `ThemeProvider`/`CssBaseline` wrap the app at the root (`index.tsx`). `App.tsx` becomes a route table instead of a `view`-state switch. Two small guard components (`ProtectedRoute`, `PublicOnlyRoute`) replace the old auth-state branching; a `Layout` component (MUI `AppBar` + `Tabs`) replaces the old inline topbar/tabs markup and hosts the subscription-status gate so the header stays visible even when a company's subscription isn't active — matching current behavior. Each page then gets its markup migrated from plain HTML/CSS classes to MUI components, one file at a time.

**Tech Stack:** React 19, TypeScript 4.9.5, Create React App (react-scripts 5), `@mui/material` 9.2.0, `@mui/icons-material` 9.2.0, `@emotion/react` 11.14.0, `@emotion/styled` 11.14.1, `react-router-dom` 6.30.4 (declarative API), `@fontsource/roboto` 5.2.10, `react-i18next`.

**Amendment (post Task 1, during Task 4):** the plan originally pinned `react-router-dom@7.18.1`. That version splits into internal `react-router` + `react-router-dom` packages with a `./dom` subpath export in `react-router`'s `package.json` `exports` map. CRA5's bundled Jest (27.5.1) does not resolve `exports` subpaths, so any test importing `react-router-dom` fails with `Cannot find module 'react-router/dom'` — a toolchain incompatibility, not a code defect. Discovered by the Task 4 implementer; user chose to downgrade to `react-router-dom@6.30.4` (latest v6, no package split, resolves fine under Jest 27) over patching Jest's `moduleNameMapper`. All later references to `react-router-dom@7.18.1` in this plan should be read as `6.30.4` — the API used (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `Navigate`, `Link`, `useNavigate`, `useLocation`) is identical in both.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-11-mui-router-migration-design.md`.
- Use MUI's **default theme** — no custom colors, typography, or border-radius overrides. `createTheme()` with zero arguments.
- **No dark mode** in this plan.
- Real URL paths: `/login`, `/signup`, `/`, `/fiscal-years`. Any other path redirects to `/`.
- `SubscriptionRequired` is not a route — it's rendered in place of the protected page content when the active company's subscription isn't `ACTIVE`.
- Keep the `AppBar` + `Tabs` navigation shape (no `Drawer`).
- `react-router-dom` is installed at its current latest major (v7) but used only via the declarative API also present in v6: `BrowserRouter`, `MemoryRouter`, `Routes`, `Route`, `Outlet`, `Navigate`, `Link`, `useNavigate`, `useLocation`. Do not introduce loaders, actions, or `createBrowserRouter`.
- The installed `@mui/material` version (9.2.0) is newer than this plan's author has direct API documentation for. Prefer the `slotProps` prop (e.g. `slotProps={{ inputLabel: { shrink: true } }}`) over older per-slot props (e.g. `InputLabelProps`) — `slotProps` has been the forward-compatible API since MUI v6 and is what this plan uses throughout. If TypeScript flags any MUI prop used in this plan as unknown, check `node_modules/@mui/material/TextField/TextField.d.ts` (or the relevant component's `.d.ts`) for the actual installed signature before deviating — the intent (e.g. "shrink this field's label") stays the same even if the exact prop name has moved.
- Every task must leave `CI=true npm run build` passing (`Compiled successfully`) before moving to the next task.
- `.npmrc` already sets `legacy-peer-deps=true` — no extra flags needed for `npm install`.

---

### Task 1: Install dependencies; wire up theme, router, and font at the root

**Files:**
- Modify: `package.json` (via `npm install`, no manual edit)
- Create: `src/theme.ts`
- Modify: `src/index.tsx`
- Delete: `src/index.css`

**Interfaces:**
- Produces: `theme` — named export from `src/theme.ts`, type `Theme` (from `@mui/material/styles`). Later tasks do not need to import this directly (it's only consumed by `index.tsx`), but it must exist and be MUI's default theme (`createTheme()` with no arguments).
- Produces: the render tree rooted in `index.tsx` now provides both a `Router` context (`BrowserRouter`) and an MUI theme context (`ThemeProvider` + `CssBaseline`) to `<App />`. Every later task that uses `react-router-dom` hooks/components or MUI components inside `App`'s tree relies on this.

- [ ] **Step 1: Install the new dependencies**

Run:
```bash
cd project_accounting_ui
npm install @mui/material@9.2.0 @mui/icons-material@9.2.0 @emotion/react@11.14.0 @emotion/styled@11.14.1 react-router-dom@7.18.1 @fontsource/roboto@5.2.10
```
Expected: install succeeds (exit code 0), `package.json` now lists these six packages under `dependencies`.

- [ ] **Step 2: Create `src/theme.ts`**

```ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme();
```

- [ ] **Step 3: Delete `src/index.css`**

Delete the file `src/index.css`. Its only rules (body font-family fallback stack, margin reset) are superseded by MUI's `CssBaseline` plus the Roboto font loaded in the next step.

- [ ] **Step 4: Rewrite `src/index.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from './App';
import { theme } from './theme';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
```

- [ ] **Step 5: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.` (The app still renders the old `view`-state UI at this point — `App.tsx` hasn't changed yet — this step only proves the new root wiring compiles and doesn't break anything.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/theme.ts src/index.tsx
git rm src/index.css
git commit -m "Install MUI and React Router; wire up theme, router, and Roboto font at the root"
```

---

### Task 2: Create route guard components

**Files:**
- Create: `src/routes/ProtectedRoute.tsx`
- Create: `src/routes/PublicOnlyRoute.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `../auth/AuthContext` (existing) — specifically `{ user }` (type `User | null`, from `src/types/auth.ts`).
- Produces: `ProtectedRoute` — default export, no props, function component. Renders `<Navigate to="/login" replace />` when `user` is `null`, otherwise `<Outlet />`.
- Produces: `PublicOnlyRoute` — default export, no props, function component. Renders `<Navigate to="/" replace />` when `user` is non-null, otherwise `<Outlet />`.
- Note: subscription-status gating is intentionally **not** handled here — it happens inside `Layout` (Task 3), because the topbar must stay visible even when the subscription is inactive.

- [ ] **Step 1: Create `src/routes/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Guards routes that require an authenticated session. Subscription-status
// gating (showing SubscriptionRequired) happens inside Layout, not here,
// because the topbar must stay visible even when the subscription is inactive.
export default function ProtectedRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Create `src/routes/PublicOnlyRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Guards /login and /signup: an already-authenticated user is sent to the
// dashboard instead of seeing the auth forms again.
export default function PublicOnlyRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 3: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.` (Nothing imports these two files yet, so this just confirms they type-check standalone.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/ProtectedRoute.tsx src/routes/PublicOnlyRoute.tsx
git commit -m "Add ProtectedRoute and PublicOnlyRoute guards"
```

---

### Task 3: Create the MUI Layout shell (AppBar + Tabs)

**Files:**
- Create: `src/routes/Layout.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `../auth/AuthContext` — `{ user, memberships, activeCompanyId, activeMembership, logout, switchCompany }` (existing `AuthContextValue` shape).
- Consumes: `changeLanguage`, `SUPPORTED_LANGUAGES`, `Language` from `../i18n` (existing, unchanged).
- Consumes: `SubscriptionRequired` default export from `../pages/SubscriptionRequired` (existing; its own MUI migration is Task 7, but this task can render it as-is regardless of its internal markup).
- Produces: `Layout` — default export, no props, function component. Renders the `AppBar`/`Tabs` shell and, inside `<Box component="main">`, either `<Outlet />` (when the active membership's `subscriptionStatus === 'ACTIVE'`) or `<SubscriptionRequired />` (otherwise). Later tasks (App.tsx route table) use this as the layout-route element wrapping `/` and `/fiscal-years`.

- [ ] **Step 1: Create `src/routes/Layout.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import SubscriptionRequired from '../pages/SubscriptionRequired';

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <Select
      size="small"
      value={i18n.language}
      onChange={(e: SelectChangeEvent) => changeLanguage(e.target.value as Language)}
      title={t('common.language')}
      aria-label={t('common.language')}
      sx={{ mr: 2 }}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <MenuItem key={lng} value={lng}>
          {t(`languages.${lng}`)}
        </MenuItem>
      ))}
    </Select>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, memberships, activeCompanyId, activeMembership, logout, switchCompany } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const subscriptionActive = activeMembership?.subscriptionStatus === 'ACTIVE';
  const activeTab = location.pathname === '/fiscal-years' ? '/fiscal-years' : '/';

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, mr: 2 }}>
            {t('common.appName')}
          </Typography>
          {memberships.length > 0 && (
            <Select
              size="small"
              value={activeCompanyId ?? ''}
              onChange={(e: SelectChangeEvent) => switchCompany(e.target.value)}
              title={t('nav.dashboard')}
              sx={{ mr: 2 }}
            >
              {memberships.map((m) => (
                <MenuItem key={m.companyId} value={m.companyId}>
                  {m.companyName}
                  {m.subscriptionStatus !== 'ACTIVE' ? ` (${t('common.inactive')})` : ''}
                </MenuItem>
              ))}
            </Select>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <LanguageSwitcher />
          <Typography sx={{ mr: 2 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Button color="inherit" onClick={logout}>
            {t('common.logout')}
          </Button>
        </Toolbar>
      </AppBar>

      {subscriptionActive && (
        <Tabs value={activeTab} onChange={(_, value: string) => navigate(value)}>
          <Tab label={t('nav.dashboard')} value="/" />
          <Tab label={t('nav.fiscalYears')} value="/fiscal-years" />
        </Tabs>
      )}

      <Box
        component="main"
        sx={
          subscriptionActive
            ? { maxWidth: 900, mx: 'auto', p: 3 }
            : { display: 'flex', justifyContent: 'center', p: 6 }
        }
      >
        {subscriptionActive ? <Outlet /> : <SubscriptionRequired />}
      </Box>
    </>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/routes/Layout.tsx
git commit -m "Add MUI Layout shell (AppBar + Tabs)"
```

---

### Task 4: Rewrite App.tsx for real routing; make Login/Signup route-aware

This is the task where routing goes live end-to-end, so it also makes the two minimal changes required elsewhere for the app to compile and the existing test to pass: removing `Login`/`Signup`'s parent-controlled toggle props (routes render them with no props now) in favor of `react-router-dom`'s `Link`, and wrapping the existing smoke test in a `MemoryRouter` (required because `App.tsx` no longer contains its own `BrowserRouter` — that lives in `index.tsx` from Task 1 — so rendering `<App />` alone has no Router context). Visual/MUI migration of `Login.tsx` and `Signup.tsx` themselves is deferred to Tasks 5 and 6.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Signup.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ProtectedRoute` (Task 2), `PublicOnlyRoute` (Task 2), `Layout` (Task 3).
- Produces: `Login` — default export, **no props** (was `{ onShowSignup }`). Produces: `Signup` — default export, **no props** (was `{ onShowLogin }`). Every later task, including tests, must render these with no props.
- Produces: route table — `/login`, `/signup` under `PublicOnlyRoute`; `/`, `/fiscal-years` under `ProtectedRoute` → `Layout`; `*` → redirect to `/`.

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
// @ts-ignore: CSS import type declarations not available
import './App.css';
import './i18n';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import FiscalYears from './pages/FiscalYears';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import Layout from './routes/Layout';

function AppRoutes() {
  const { t } = useTranslation();
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <Typography>{t('common.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fiscal-years" element={<FiscalYears />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
```

Note on the `/login` → success flow: `Login`'s `handleSubmit` just calls `await login(email, password)`. It does **not** need to call `navigate('/')` itself — once `login()` resolves, `AuthContext`'s `user` state becomes non-null, `PublicOnlyRoute` (which also reads `useAuth()`) re-renders, sees `user` is now truthy, and renders `<Navigate to="/" replace />` automatically. Same mechanism for `Signup`.

- [ ] **Step 2: Make `Login` route-aware (remove props, swap the toggle button for a `Link`)**

Replace the full contents of `src/pages/Login.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>{t('auth.login.title')}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t('auth.login.email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          {t('auth.login.password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
      </form>
      <p>
        {t('auth.login.noAccount')} <Link to="/signup">{t('auth.login.signUp')}</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Make `Signup` route-aware (remove props, swap the toggle button for a `Link`)**

Replace the full contents of `src/pages/Signup.tsx`:

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  businessId: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;
}

export default function Signup() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [form, setForm] = useState<SignupFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    businessId: '',
    billingEmail: '',
    billingAddress: '',
    billingCity: '',
    billingPostalCode: '',
    billingCountry: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(field: keyof SignupFormState) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(form);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>{t('auth.signup.title')}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t('auth.signup.firstName')}
          <input value={form.firstName} onChange={set('firstName')} required autoFocus />
        </label>
        <label>
          {t('auth.signup.lastName')}
          <input value={form.lastName} onChange={set('lastName')} required />
        </label>
        <label>
          {t('auth.signup.email')}
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          {t('auth.signup.passwordHint')}
          <input type="password" value={form.password} onChange={set('password')} minLength={10} required />
        </label>
        <label>
          {t('auth.signup.companyName')}
          <input value={form.companyName} onChange={set('companyName')} required />
        </label>
        <label>
          {t('auth.signup.businessId')}
          <input value={form.businessId} onChange={set('businessId')} required />
        </label>
        <label>
          {t('auth.signup.billingEmail')}
          <input type="email" value={form.billingEmail} onChange={set('billingEmail')} required />
        </label>
        <label>
          {t('auth.signup.billingAddress')}
          <input value={form.billingAddress} onChange={set('billingAddress')} required />
        </label>
        <label>
          {t('auth.signup.billingCity')}
          <input value={form.billingCity} onChange={set('billingCity')} required />
        </label>
        <label>
          {t('auth.signup.billingPostalCode')}
          <input value={form.billingPostalCode} onChange={set('billingPostalCode')} required />
        </label>
        <label>
          {t('auth.signup.billingCountry')}
          <input value={form.billingCountry} onChange={set('billingCountry')} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? t('auth.signup.submitting') : t('auth.signup.submit')}
        </button>
      </form>
      <p>
        {t('auth.signup.haveAccount')} <Link to="/login">{t('auth.signup.logIn')}</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Update `src/App.test.tsx` to provide a Router context**

Replace the full contents of `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// With no backend reachable, /api/auth/me rejects and the app settles on the
// logged-out view, redirecting from "/" to "/login". The email field's label
// is language-independent enough to assert on (matches both the Finnish and
// English translations).
test('renders the login screen when logged out', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByLabelText(/email|sähköposti/i)).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the test**

Run: `npm test -- --watchAll=false App.test`
Expected: `PASS src/App.test.tsx`, 1 test passed.

- [ ] **Step 6: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/pages/Login.tsx src/pages/Signup.tsx
git commit -m "Rewrite App.tsx around React Router; make Login/Signup route-aware"
```

---

### Task 5: Migrate Login.tsx to MUI

**Files:**
- Modify: `src/pages/Login.tsx`

**Interfaces:**
- No signature changes — `Login` remains a no-props default export. Only the JSX inside changes.

- [ ] **Step 1: Replace the full contents of `src/pages/Login.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {t('auth.login.title')}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="email"
              label={t('auth.login.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              type="password"
              label={t('auth.login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? t('auth.login.submitting') : t('auth.login.submit')}
            </Button>
          </Box>
          <Typography sx={{ mt: 2 }}>
            {t('auth.login.noAccount')}{' '}
            <Link component={RouterLink} to="/signup">
              {t('auth.login.signUp')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 2: Run the smoke test**

Run: `npm test -- --watchAll=false App.test`
Expected: `PASS src/App.test.tsx` (the test asserts on the email field's accessible label, which `TextField label=` still provides).

- [ ] **Step 3: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "Migrate Login page to MUI components"
```

---

### Task 6: Migrate Signup.tsx to MUI

**Files:**
- Modify: `src/pages/Signup.tsx`

**Interfaces:**
- No signature changes — `Signup` remains a no-props default export, `SignupFormState` shape unchanged. Only the JSX inside changes.

- [ ] **Step 1: Replace the full contents of `src/pages/Signup.tsx`**

```tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  businessId: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;
}

export default function Signup() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [form, setForm] = useState<SignupFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    businessId: '',
    billingEmail: '',
    billingAddress: '',
    billingCity: '',
    billingPostalCode: '',
    billingCountry: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(field: keyof SignupFormState) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(form);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {t('auth.signup.title')}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('auth.signup.firstName')}
              value={form.firstName}
              onChange={set('firstName')}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label={t('auth.signup.lastName')}
              value={form.lastName}
              onChange={set('lastName')}
              required
              fullWidth
            />
            <TextField
              type="email"
              label={t('auth.signup.email')}
              value={form.email}
              onChange={set('email')}
              required
              fullWidth
            />
            <TextField
              type="password"
              label={t('auth.signup.passwordHint')}
              value={form.password}
              onChange={set('password')}
              slotProps={{ htmlInput: { minLength: 10 } }}
              required
              fullWidth
            />
            <TextField
              label={t('auth.signup.companyName')}
              value={form.companyName}
              onChange={set('companyName')}
              required
              fullWidth
            />
            <TextField
              label={t('auth.signup.businessId')}
              value={form.businessId}
              onChange={set('businessId')}
              required
              fullWidth
            />
            <TextField
              type="email"
              label={t('auth.signup.billingEmail')}
              value={form.billingEmail}
              onChange={set('billingEmail')}
              required
              fullWidth
            />
            <TextField
              label={t('auth.signup.billingAddress')}
              value={form.billingAddress}
              onChange={set('billingAddress')}
              required
              fullWidth
            />
            <TextField
              label={t('auth.signup.billingCity')}
              value={form.billingCity}
              onChange={set('billingCity')}
              required
              fullWidth
            />
            <TextField
              label={t('auth.signup.billingPostalCode')}
              value={form.billingPostalCode}
              onChange={set('billingPostalCode')}
              required
              fullWidth
            />
            <TextField
              label={t('auth.signup.billingCountry')}
              value={form.billingCountry}
              onChange={set('billingCountry')}
              required
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? t('auth.signup.submitting') : t('auth.signup.submit')}
            </Button>
          </Box>
          <Typography sx={{ mt: 2 }}>
            {t('auth.signup.haveAccount')}{' '}
            <Link component={RouterLink} to="/login">
              {t('auth.signup.logIn')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
```

- [ ] **Step 2: Run the smoke test**

Run: `npm test -- --watchAll=false App.test`
Expected: `PASS src/App.test.tsx`.

- [ ] **Step 3: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Signup.tsx
git commit -m "Migrate Signup page to MUI components"
```

---

### Task 7: Migrate SubscriptionRequired.tsx to MUI

**Files:**
- Modify: `src/pages/SubscriptionRequired.tsx`

**Interfaces:**
- No signature changes — default export, no props.

- [ ] **Step 1: Replace the full contents of `src/pages/SubscriptionRequired.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';

// Shown when the active company's subscription is not ACTIVE. Layout keeps
// the AppBar (with the company switcher) visible around this, so a member of
// several companies can switch to a paid one.
export default function SubscriptionRequired() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();

  return (
    <Card sx={{ width: '100%', maxWidth: 480 }}>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('subscription.title')}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <strong>{activeMembership?.companyName}</strong>{' '}
          {t('subscription.statusNote', { status: activeMembership?.subscriptionStatus ?? '' })}
        </Typography>
        <Typography>{t('subscription.body')}</Typography>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/pages/SubscriptionRequired.tsx
git commit -m "Migrate SubscriptionRequired page to MUI components"
```

---

### Task 8: Migrate Home.tsx to MUI

**Files:**
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- No signature changes — default export, no props. `PingResponse` interface unchanged.

- [ ] **Step 1: Replace the full contents of `src/pages/Home.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Card, CardContent, Typography } from '@mui/material';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface PingResponse {
  ok: boolean;
  companyId: string;
  role: string;
}

// Bare landing page proving gated data access: /api/ping only answers when the
// session is valid AND the active company's subscription is ACTIVE.
export default function Home() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const [ping, setPing] = useState<PingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PingResponse>('/api/ping').then(setPing).catch((err) => setError(err.message));
  }, [activeMembership?.companyId]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {activeMembership?.companyName}
        </Typography>
        <Typography>
          {t('dashboard.roleLabel')} <strong>{activeMembership?.role}</strong>
          {activeMembership?.isAdmin ? ` (${t('common.administrator')})` : ''}
        </Typography>
        {ping && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {t('dashboard.connected', { companyId: ping.companyId })}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Typography sx={{ mt: 2 }}>{t('dashboard.placeholder')}</Typography>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "Migrate Home page to MUI components"
```

---

### Task 9: Migrate FiscalYears.tsx to MUI

**Files:**
- Modify: `src/pages/FiscalYears.tsx`

**Interfaces:**
- No signature changes — default export, no props. `StatusBadge`, `FiscalYearCard`, `NewFiscalYearForm` remain internal (non-exported) components with the same prop shapes as today.
- Consumes (unchanged): `fiscalYearsApi` from `../api/fiscalYears`, `FiscalYear`/`PeriodGranularity`/`PeriodStatus` from `../types/fiscal`, `roleAtLeast` from `../lib/roles`, `formatDateRange` from `../lib/format`.

- [ ] **Step 1: Replace the full contents of `src/pages/FiscalYears.tsx`**

```tsx
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { fiscalYearsApi } from '../api/fiscalYears';
import type { FiscalYear, PeriodGranularity, PeriodStatus } from '../types/fiscal';
import { roleAtLeast } from '../lib/roles';
import { formatDateRange } from '../lib/format';

// Fiscal year management. Everyone with access can view; creating, closing,
// reopening and deleting require ACCOUNTANT+ (mirrors the backend). The whole
// list is reloaded after each mutation so it always reflects server state.
export default function FiscalYears() {
  const { t, i18n } = useTranslation();
  const { activeMembership } = useAuth();
  const canManage = roleAtLeast(activeMembership?.role, 'ACCOUNTANT');

  const [years, setYears] = useState<FiscalYear[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setYears(await fiscalYearsApi.list());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeMembership?.companyId]);

  // Runs a mutation keyed by an id (fiscal year or period) so only its buttons
  // show a busy state, then refreshes the list.
  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const lang = i18n.language;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('fiscalYears.title')}
        </Typography>
        {canManage && (
          <Button variant="contained" onClick={() => setShowForm((s) => !s)}>
            {t('fiscalYears.newButton')}
          </Button>
        )}
      </Box>

      {!canManage && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('fiscalYears.readOnlyNote')}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showForm && canManage && (
        <NewFiscalYearForm
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
          onError={setError}
        />
      )}

      {years === null ? (
        <Typography>{t('common.loading')}</Typography>
      ) : years.length === 0 ? (
        <Typography color="text.secondary">{t('fiscalYears.empty')}</Typography>
      ) : (
        years.map((fy) => (
          <FiscalYearCard key={fy.id} fy={fy} lang={lang} canManage={canManage} busyId={busyId} onRun={run} />
        ))
      )}
    </Box>
  );
}

function StatusBadge({ status }: { status: PeriodStatus }) {
  const { t } = useTranslation();
  return (
    <Chip size="small" label={t(`fiscalYears.status.${status}`)} color={status === 'OPEN' ? 'success' : 'error'} />
  );
}

interface FiscalYearCardProps {
  fy: FiscalYear;
  lang: string;
  canManage: boolean;
  busyId: string | null;
  onRun: (id: string, action: () => Promise<unknown>) => void;
}

function FiscalYearCard({ fy, lang, canManage, busyId, onRun }: FiscalYearCardProps) {
  const { t } = useTranslation();
  const isOpen = fy.status === 'OPEN';
  const allPeriodsClosed = fy.periods.every((p) => p.status === 'CLOSED');
  const range = formatDateRange(fy.startDate, fy.endDate, lang);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" component="h2">
              {range}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('fiscalYears.granularityLabel', { value: t(`fiscalYears.granularity.${fy.granularity}`) })}
            </Typography>
          </Box>
          <StatusBadge status={fy.status} />
        </Box>

        {canManage && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
            {isOpen ? (
              <Button
                variant="outlined"
                disabled={!allPeriodsClosed || busyId === fy.id}
                title={!allPeriodsClosed ? t('fiscalYears.hints.closeYearBlocked') : undefined}
                onClick={() => onRun(fy.id, () => fiscalYearsApi.close(fy.id))}
              >
                {t('fiscalYears.actions.closeYear')}
              </Button>
            ) : (
              <Button
                variant="outlined"
                disabled={busyId === fy.id}
                onClick={() => onRun(fy.id, () => fiscalYearsApi.reopen(fy.id))}
              >
                {t('fiscalYears.actions.reopenYear')}
              </Button>
            )}
            {isOpen && (
              <Button
                variant="outlined"
                color="error"
                disabled={busyId === fy.id}
                onClick={() => {
                  if (window.confirm(t('fiscalYears.confirmDelete', { range }))) {
                    onRun(fy.id, () => fiscalYearsApi.remove(fy.id));
                  }
                }}
              >
                {t('fiscalYears.actions.deleteYear')}
              </Button>
            )}
          </Box>
        )}

        <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>
          {t('fiscalYears.periodsTitle')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              {fy.periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{t('fiscalYears.period', { index: p.index })}</TableCell>
                  <TableCell>{formatDateRange(p.startDate, p.endDate, lang)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell align="right">
                    {canManage &&
                      isOpen &&
                      (p.status === 'OPEN' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === p.id}
                          onClick={() => onRun(p.id, () => fiscalYearsApi.closePeriod(p.id))}
                        >
                          {t('fiscalYears.actions.closePeriod')}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === p.id}
                          onClick={() => onRun(p.id, () => fiscalYearsApi.reopenPeriod(p.id))}
                        >
                          {t('fiscalYears.actions.reopenPeriod')}
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

interface NewFiscalYearFormProps {
  onCreated: () => void;
  onError: (message: string) => void;
}

function NewFiscalYearForm({ onCreated, onError }: NewFiscalYearFormProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [granularity, setGranularity] = useState<PeriodGranularity>('MONTH');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await fiscalYearsApi.create({ startDate, endDate, granularity });
      onCreated();
    } catch (err) {
      onError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {t('fiscalYears.form.title')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField
              type="date"
              label={t('fiscalYears.form.startDate')}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              label={t('fiscalYears.form.endDate')}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label={t('fiscalYears.form.granularity')}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as PeriodGranularity)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="MONTH">{t('fiscalYears.granularity.MONTH')}</MenuItem>
              <MenuItem value="QUARTER">{t('fiscalYears.granularity.QUARTER')}</MenuItem>
            </TextField>
          </Box>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('fiscalYears.form.submitting') : t('fiscalYears.form.submit')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add src/pages/FiscalYears.tsx
git commit -m "Migrate FiscalYears page to MUI components"
```

---

### Task 10: Remove App.css and verify the full migration

Every page now renders exclusively through MUI components — no file references `App.css`'s classes (`.card`, `.error`, `.topbar`, `.tabs`, `.badge-*`, `.page-head`, `.fy-*`, `table.periods`, etc.) any more. This task deletes the now-dead stylesheet and does a final end-to-end check.

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/App.css`

**Interfaces:** None — this is cleanup only, no exported signatures change.

- [ ] **Step 1: Confirm nothing still references `App.css` classes**

Run: `grep -rn "className=" src/ --include=*.tsx`
Expected: no matches referencing the old class names (`card`, `error`, `topbar`, `tabs`, `tab`, `badge`, `page-head`, `fy-`, `periods`, `muted`, `ok`, `center`, `content`, `link`, `secondary`, `danger`). If any remain, that page's migration task was incomplete — go back and fix it before continuing.

- [ ] **Step 2: Remove the `App.css` import from `src/App.tsx`**

In `src/App.tsx`, delete these two lines:
```tsx
// @ts-ignore: CSS import type declarations not available
import './App.css';
```

- [ ] **Step 3: Delete `src/App.css`**

Delete the file `src/App.css`.

- [ ] **Step 4: Run the full test suite**

Run: `npm test -- --watchAll=false`
Expected: all tests pass (`Tests: 1 passed, 1 total` unless other test files exist).

- [ ] **Step 5: Verify the production build**

Run: `CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git rm src/App.css
git commit -m "Remove App.css now that all pages use MUI components"
```

---

## Self-Review Notes

- **Spec coverage:** dependencies (Task 1) ✓; routing table incl. redirect-if-authenticated and redirect-if-unauthenticated and wildcard redirect (Tasks 2, 4) ✓; `SubscriptionRequired` as a state gate, not a route (Task 3, `Layout`) ✓; `AppBar` + `Tabs` shell (Task 3) ✓; every component-mapping row (Tasks 5–9) ✓; `App.test.tsx` `MemoryRouter` wrap (Task 4) ✓; `App.css`/`index.css` removal (Tasks 1, 10) ✓; default theme / no dark mode (Task 1, Global Constraints) ✓.
- **Ordering fix applied:** the spec's task list names "migrate pages" before the App.tsx rewrite is implied complete, but `Login`/`Signup` cannot lose their toggle-callback props independently of `App.tsx` calling them with zero props — that dependency is resolved by folding the minimal prop removal into Task 4 (routing) and leaving pure MUI visual migration to Tasks 5–6.
- **Type consistency:** `Login`/`Signup`/`SubscriptionRequired`/`Home`/`FiscalYears` are no-prop default exports from Task 4 onward, consistently referenced that way in `App.tsx` and never given props again in later tasks.
