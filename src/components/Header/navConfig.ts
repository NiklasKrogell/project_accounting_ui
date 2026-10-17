import type { Role } from '../../types/auth';

// Actions a nav menu item can trigger instead of navigating. Handled by
// Layout's onAction; the union grows as more action items are added.
export type NavAction = 'newJournalEntry' | 'newPurchaseInvoice';

export interface NavMenuEntry {
  labelKey: string;
  path?: string;
  action?: NavAction;
  minRole?: Role;
}

// A tab is either a plain route link or a dropdown menu. For menu tabs the
// value is either a route prefix (navigation menus — the tab highlights when
// any child route is active) or a synthetic id that resolveActiveTab never
// returns (action menus — the tab indicator never lands on them).
export type NavTab =
  | { kind: 'link'; labelKey: string; value: string }
  | { kind: 'menu'; labelKey: string; value: string; items: NavMenuEntry[] };

export const SETTINGS_PATH = '/settings';
export const BANK_STATEMENTS_PATH = '/accounting/bank-statements';
export const PURCHASE_INVOICES_PATH = '/purchases/invoices';

// Pages laid out as panes that scroll on their own. Layout gives them the
// whole area under the tabs, bound to the height of the window, instead of
// the centered content column.
export const WINDOW_FILLING_PATHS: string[] = [BANK_STATEMENTS_PATH, PURCHASE_INVOICES_PATH];

// Single extensibility point for the tab bar: add new tabs and menu items here.
export const NAV_TABS: NavTab[] = [
  { kind: 'link', labelKey: 'nav.dashboard', value: '/' },
  {
    kind: 'menu',
    labelKey: 'nav.accounting',
    value: '/accounting',
    items: [
      { labelKey: 'nav.newEntry', action: 'newJournalEntry', minRole: 'LEDGER' },
      { labelKey: 'nav.bankStatements', path: BANK_STATEMENTS_PATH },
      { labelKey: 'nav.journal', path: '/accounting/journal' },
      { labelKey: 'nav.fiscalYears', path: '/fiscal-years' },
      { labelKey: 'nav.chartOfAccounts', path: '/accounting/chart-of-accounts' },
      { labelKey: 'nav.costCenters', path: '/accounting/cost-centers' },
    ],
  },
  {
    kind: 'menu',
    labelKey: 'nav.purchases',
    value: '/purchases',
    items: [
      { labelKey: 'nav.newPurchaseInvoice', action: 'newPurchaseInvoice', minRole: 'LEDGER' },
      { labelKey: 'nav.purchaseInvoices', path: PURCHASE_INVOICES_PATH },
    ],
  },
  { kind: 'menu', labelKey: 'nav.sales', value: '/sales', items: [] },
  {
    kind: 'menu',
    labelKey: 'nav.reports',
    value: '/reports',
    items: [
      { labelKey: 'nav.generalLedger', path: '/accounting/general-ledger' },
      { labelKey: 'nav.incomeStatement', path: '/reports/income-statement' },
      { labelKey: 'nav.balanceSheet', path: '/reports/balance-sheet' },
    ],
  },
  { kind: 'link', labelKey: 'nav.settings', value: SETTINGS_PATH },
];

// Maps the current pathname to the tab that should be highlighted: exact link
// match first, then the menu tab owning an item with that path, then the tab
// whose value prefixes the path (a menu's child routes, or a link's sub-pages
// such as /settings/general), else '/'.
export function resolveActiveTab(pathname: string): string {
  for (const tab of NAV_TABS) {
    if (tab.kind === 'link' && tab.value === pathname) return tab.value;
  }
  for (const tab of NAV_TABS) {
    if (tab.kind === 'menu' && tab.items.some((item) => item.path === pathname)) return tab.value;
  }
  for (const tab of NAV_TABS) {
    if (tab.value.startsWith('/') && tab.value !== '/' && pathname.startsWith(`${tab.value}/`)) {
      return tab.value;
    }
  }
  return '/';
}
