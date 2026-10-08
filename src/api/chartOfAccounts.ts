import { api } from './client';
import type { VatAccounts } from '../types/account';

// Typed wrappers over the chart-level settings of the chart of accounts. The
// update is a full replace (PUT): both accounts are sent, null clears one.
export const chartOfAccountsApi = {
  getVatAccounts: () => api<VatAccounts>('/api/chart-of-accounts/vat-accounts'),

  setVatAccounts: (input: VatAccounts) =>
    api<VatAccounts>('/api/chart-of-accounts/vat-accounts', { method: 'PUT', body: input }),
};
