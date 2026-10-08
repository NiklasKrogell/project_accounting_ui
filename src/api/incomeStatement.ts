import { api } from './client';
import type { IncomeStatement, IncomeStatementFilter } from '../types/incomeStatement';

// Typed wrapper over the income statement (tuloslaskelma) report endpoint.
export const incomeStatementApi = {
  get: ({ period, comparison, costCenterId }: IncomeStatementFilter) => {
    const params = new URLSearchParams({ from: period.from, to: period.to });
    if (comparison) {
      params.set('compareFrom', comparison.from);
      params.set('compareTo', comparison.to);
    }
    if (costCenterId) params.set('costCenterId', costCenterId);
    return api<IncomeStatement>(`/api/income-statement?${params.toString()}`);
  },
};
