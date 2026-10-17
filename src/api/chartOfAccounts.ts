import { api } from './client';
import type { TradePayablesAccount, VatAccounts } from '../types/account';

// Typed wrappers over the chart-level settings of the chart of accounts. The
// updates are full replaces (PUT): every account is sent, null clears one.
export const chartOfAccountsApi = {
  getVatAccounts: () => api<VatAccounts>('/api/chart-of-accounts/vat-accounts'),

  setVatAccounts: (input: VatAccounts) =>
    api<VatAccounts>('/api/chart-of-accounts/vat-accounts', { method: 'PUT', body: input }),

  getTradePayablesAccount: () =>
    api<TradePayablesAccount>('/api/chart-of-accounts/trade-payables-account'),

  setTradePayablesAccount: (input: TradePayablesAccount) =>
    api<TradePayablesAccount>('/api/chart-of-accounts/trade-payables-account', {
      method: 'PUT',
      body: input,
    }),
};
