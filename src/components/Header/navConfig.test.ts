import { resolveActiveTab } from './navConfig';

test('highlights the settings tab on the settings page and its sections', () => {
  expect(resolveActiveTab('/settings')).toBe('/settings');
  expect(resolveActiveTab('/settings/general')).toBe('/settings');
});

test('highlights the menu tab that owns the current route', () => {
  expect(resolveActiveTab('/')).toBe('/');
  expect(resolveActiveTab('/accounting/journal')).toBe('/accounting');
  expect(resolveActiveTab('/fiscal-years')).toBe('/accounting');
  expect(resolveActiveTab('/accounting/general-ledger')).toBe('/reports');
});
