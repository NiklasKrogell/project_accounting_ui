import { api, apiWithMeta } from './client';
import type {
  CreateJournalEntryInput,
  JournalEntry,
  JournalEntryListFilter,
  ListMeta,
  UpdateJournalEntryInput,
} from '../types/journal';

function toQueryString(filter: JournalEntryListFilter): string {
  const params = new URLSearchParams();
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  if (filter.voucherType) params.set('voucherType', filter.voucherType);
  if (filter.take !== undefined) params.set('take', String(filter.take));
  if (filter.skip !== undefined) params.set('skip', String(filter.skip));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Typed wrappers over the journal-entry endpoints. Amounts are euro decimals;
// dates are 'YYYY-MM-DD' strings.
export const journalEntriesApi = {
  list: (filter: JournalEntryListFilter = {}) =>
    apiWithMeta<JournalEntry[], ListMeta>(`/api/journal-entries${toQueryString(filter)}`),
  get: (id: string) => api<JournalEntry>(`/api/journal-entries/${id}`),
  create: (input: CreateJournalEntryInput) =>
    api<JournalEntry>('/api/journal-entries', { method: 'POST', body: input }),
  update: (id: string, input: UpdateJournalEntryInput) =>
    api<JournalEntry>(`/api/journal-entries/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => api<void>(`/api/journal-entries/${id}`, { method: 'DELETE' }),
};
