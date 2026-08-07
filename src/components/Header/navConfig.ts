import type { Role } from '../../types/auth';

// Actions a nav menu item can trigger instead of navigating. Handled by
// Layout's onAction; the union grows as more action items are added.
export type NavAction = 'newJournalEntry';

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

// Single extensibility point for the tab bar: add new tabs and menu items here.
export const NAV_TABS: NavTab[] = [
  { kind: 'link', labelKey: 'nav.dashboard', value: '/' },
  { kind: 'link', labelKey: 'nav.fiscalYears', value: '/fiscal-years' },
  {
    kind: 'menu',
    labelKey: 'nav.accounting',
    value: '/accounting',
    items: [
      { labelKey: 'nav.newEntry', action: 'newJournalEntry', minRole: 'LEDGER' },
      { labelKey: 'nav.journal', path: '/accounting/journal' },
      { labelKey: 'nav.chartOfAccounts', path: '/accounting/chart-of-accounts' },
    ],
  },
];

// Maps the current pathname to the tab that should be highlighted: exact link
// match first, then the menu tab whose value prefixes the path, else '/'.
export function resolveActiveTab(pathname: string): string {
  for (const tab of NAV_TABS) {
    if (tab.kind === 'link' && tab.value === pathname) return tab.value;
  }
  for (const tab of NAV_TABS) {
    if (tab.kind === 'menu' && tab.value.startsWith('/') && pathname.startsWith(tab.value)) {
      return tab.value;
    }
  }
  return '/';
}
