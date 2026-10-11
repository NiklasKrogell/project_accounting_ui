import { api, apiWithMeta } from './client';
import type {
  BankStatement,
  BankStatementListFilter,
  BankStatementPatch,
  BankStatementSummary,
} from '../types/bankStatement';
import type { ListMeta } from '../types/journal';

function toQueryString(filter: BankStatementListFilter): string {
  const params = new URLSearchParams();
  if (filter.posted !== undefined) params.set('posted', String(filter.posted));
  if (filter.take !== undefined) params.set('take', String(filter.take));
  if (filter.skip !== undefined) params.set('skip', String(filter.skip));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Typed wrappers over the bank statement endpoints. A statement's entries go
// through journalEntriesApi (filtered by bankStatementId) and its PDF through
// filesApi.
export const bankStatementsApi = {
  list: (filter: BankStatementListFilter = {}) =>
    apiWithMeta<BankStatement[], ListMeta>(`/api/bank-statements${toQueryString(filter)}`),
  get: (id: string) => api<BankStatement>(`/api/bank-statements/${id}`),
  // One PDF becomes one statement.
  import: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return api<BankStatement>('/api/bank-statements', { method: 'POST', body });
  },
  update: (id: string, patch: BankStatementPatch) =>
    api<BankStatement>(`/api/bank-statements/${id}`, { method: 'PATCH', body: patch }),
  summary: (id: string) => api<BankStatementSummary>(`/api/bank-statements/${id}/summary`),
};
