import { apiWithMeta } from './client';
import type { GeneralLedgerAccount, GeneralLedgerFilter } from '../types/generalLedger';
import type { ListMeta } from '../types/journal';

function toQueryString(filter: GeneralLedgerFilter): string {
  const params = new URLSearchParams();
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  if (filter.accountId) params.set('accountId', filter.accountId);
  if (filter.costCenterId) params.set('costCenterId', filter.costCenterId);
  // Explicit undefined checks so skip=0 survives.
  if (filter.take !== undefined) params.set('take', String(filter.take));
  if (filter.skip !== undefined) params.set('skip', String(filter.skip));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Typed wrapper over the general-ledger (pääkirja) report endpoint. Paginated
// by account, so meta.total counts accounts rather than lines.
export const generalLedgerApi = {
  list: (filter: GeneralLedgerFilter = {}) =>
    apiWithMeta<GeneralLedgerAccount[], ListMeta>(`/api/general-ledger${toQueryString(filter)}`),
};
