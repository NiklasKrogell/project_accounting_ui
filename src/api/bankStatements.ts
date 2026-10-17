import { api, apiWithMeta } from './client';
import type {
  BankStatement,
  BankStatementLine,
  BankStatementListFilter,
  BankStatementPatch,
  BankStatementSummary,
  CsvImportResult,
  CsvMapping,
  CsvPreview,
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

// A bank's CSV export, with the columns to read it with when they are chosen
// (left out, the server guesses them).
function csvBody(file: File, mapping?: CsvMapping): FormData {
  const body = new FormData();
  body.append('file', file);
  if (mapping) body.append('mapping', JSON.stringify(mapping));
  return body;
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
  // The statement's transactions, imported from the bank's CSV export.
  lines: (id: string) => api<BankStatementLine[]>(`/api/bank-statements/${id}/lines`),
  // What importing the file would do; nothing is saved.
  csvPreview: (id: string, file: File, mapping?: CsvMapping) =>
    api<CsvPreview>(`/api/bank-statements/${id}/csv-preview`, {
      method: 'POST',
      body: csvBody(file, mapping),
    }),
  importCsv: (id: string, file: File, mapping: CsvMapping) =>
    api<CsvImportResult>(`/api/bank-statements/${id}/lines`, {
      method: 'POST',
      body: csvBody(file, mapping),
    }),
  removeLine: (id: string, lineId: string) =>
    api<void>(`/api/bank-statements/${id}/lines/${lineId}`, { method: 'DELETE' }),
};
