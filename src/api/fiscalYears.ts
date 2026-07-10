import { api } from './client';
import type { AccountingPeriod, CreateFiscalYearInput, FiscalYear } from '../types/fiscal';

// Typed wrappers over the fiscal-year and accounting-period endpoints.
export const fiscalYearsApi = {
  list: () => api<FiscalYear[]>('/api/fiscal-years'),
  create: (input: CreateFiscalYearInput) =>
    api<FiscalYear>('/api/fiscal-years', { method: 'POST', body: input }),
  close: (id: string) => api<FiscalYear>(`/api/fiscal-years/${id}/close`, { method: 'POST' }),
  reopen: (id: string) => api<FiscalYear>(`/api/fiscal-years/${id}/reopen`, { method: 'POST' }),
  remove: (id: string) => api<void>(`/api/fiscal-years/${id}`, { method: 'DELETE' }),
  closePeriod: (id: string) =>
    api<AccountingPeriod>(`/api/accounting-periods/${id}/close`, { method: 'POST' }),
  reopenPeriod: (id: string) =>
    api<AccountingPeriod>(`/api/accounting-periods/${id}/reopen`, { method: 'POST' }),
};
