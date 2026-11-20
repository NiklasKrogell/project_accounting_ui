# Project accounting – UI

Web client for a multi-tenant accounting SaaS: journal entries, fiscal years, chart of accounts, bank statements, purchase and sales invoices, financial reports and company settings. The UI is in Finnish, with English as the fallback language.

It talks to the API in the sibling repo [project_accounting_backend](https://github.com/NiklasKrogell/project_accounting_backend).

## Tech stack

- React 19 + TypeScript on Create React App (react-scripts 5)
- MUI (Material UI) for components
- React Router v6
- i18next / react-i18next for translations
- pdf.js for showing invoice and bank statement PDFs
- Jest + Testing Library for tests

## Getting started

Start the backend first (it serves the API on `http://localhost:4000`), then:

```bash
npm install     # .npmrc sets legacy-peer-deps, needed with React 19
npm start       # dev server on http://localhost:3000
```

To get in: sign up at `/signup`, register a company, then activate it with the backend's `npm run activate:company` (subscriptions aren't wired to payments yet).

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Dev server on port 3000 (doesn't open a browser, see `.env`) |
| `npm run build` | Production build into `build/` |
| `npm test` | Tests in watch mode (`npm test -- --watchAll=false` runs them once) |

`npm start` and `npm run build` first copy the pdf.js worker into `public/` (`scripts/copy-pdfjs-assets.js`).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `REACT_APP_API_URL` | `http://localhost:4000` | Backend address; requests are sent with credentials (cookies) |

The backend's `CORS_ORIGIN` must match the origin the UI is served from.

## Project layout

```
src/
  api/          one module per backend resource, on top of client.ts
  auth/         AuthContext: session, memberships, active company
  pages/        routed pages
  components/   UI by feature area (Journal, BankStatements, PurchaseInvoices, Settings…)
  routes/       layout and route guards
  i18n/         translations
  lib/          shared helpers (roles, VAT, IBAN, money, dates…)
```

CI (`.github/workflows/ci.yml`) runs the tests once and builds the app on Node 22.

See [CLAUDE.md](CLAUDE.md) for the detailed architecture and conventions.
