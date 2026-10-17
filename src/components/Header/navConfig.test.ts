import { NAV_TABS, resolveActiveTab } from './navConfig';

test('lists the bank statements right under the new entry action of the accounting menu', () => {
  const accounting = NAV_TABS.find((tab) => tab.value === '/accounting');
  const items = accounting?.kind === 'menu' ? accounting.items : [];
  expect(items.slice(0, 2).map((item) => item.labelKey)).toEqual([
    'nav.newEntry',
    'nav.bankStatements',
  ]);
});

test('starts the purchases menu with a new invoice, for LEDGER and up, then the invoices', () => {
  const purchases = NAV_TABS.find((tab) => tab.value === '/purchases');
  const items = purchases?.kind === 'menu' ? purchases.items : [];
  expect(items).toEqual([
    { labelKey: 'nav.newPurchaseInvoice', action: 'newPurchaseInvoice', minRole: 'LEDGER' },
    { labelKey: 'nav.purchaseInvoices', path: '/purchases/invoices' },
  ]);
  expect(resolveActiveTab('/purchases/invoices')).toBe('/purchases');
});

test('highlights the settings tab on the settings page and its sections', () => {
  expect(resolveActiveTab('/settings')).toBe('/settings');
  expect(resolveActiveTab('/settings/user/general')).toBe('/settings');
  expect(resolveActiveTab('/settings/company/vat-accounts')).toBe('/settings');
});

test('highlights the menu tab that owns the current route', () => {
  expect(resolveActiveTab('/')).toBe('/');
  expect(resolveActiveTab('/accounting/journal')).toBe('/accounting');
  expect(resolveActiveTab('/accounting/bank-statements')).toBe('/accounting');
  expect(resolveActiveTab('/fiscal-years')).toBe('/accounting');
  expect(resolveActiveTab('/accounting/general-ledger')).toBe('/reports');
});
