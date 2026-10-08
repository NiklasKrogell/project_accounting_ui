import { api } from './client';
import type { BalanceSheet, BalanceSheetFilter } from '../types/balanceSheet';

// Typed wrapper over the balance sheet (tase) report endpoint.
export const balanceSheetApi = {
  get: ({ date, comparisonDate }: BalanceSheetFilter) => {
    const params = new URLSearchParams({ date });
    if (comparisonDate) params.set('compareDate', comparisonDate);
    return api<BalanceSheet>(`/api/balance-sheet?${params.toString()}`);
  },
};
