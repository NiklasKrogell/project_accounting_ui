import { api, apiWithMeta } from './client';
import type { StoredFile } from '../types/file';
import type { ListMeta } from '../types/journal';
import type {
  PurchaseInvoice,
  PurchaseInvoiceInput,
  PurchaseInvoiceListFilter,
  PurchaseInvoiceStatusChange,
} from '../types/purchaseInvoice';

function toQueryString(filter: PurchaseInvoiceListFilter): string {
  const params = new URLSearchParams();
  if (filter.statuses?.length) params.set('status', filter.statuses.join(','));
  if (filter.supplierId) params.set('supplierId', filter.supplierId);
  if (filter.invoiceDateFrom) params.set('invoiceDateFrom', filter.invoiceDateFrom);
  if (filter.invoiceDateTo) params.set('invoiceDateTo', filter.invoiceDateTo);
  if (filter.dueFrom) params.set('dueFrom', filter.dueFrom);
  if (filter.dueTo) params.set('dueTo', filter.dueTo);
  if (filter.search?.trim()) params.set('search', filter.search.trim());
  if (filter.sort) params.set('sort', filter.sort);
  if (filter.order) params.set('order', filter.order);
  if (filter.take !== undefined) params.set('take', String(filter.take));
  if (filter.skip !== undefined) params.set('skip', String(filter.skip));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Typed wrappers over the purchase invoice endpoints. The list is filtered,
// sorted and paged by the server (by due date unless sorted otherwise). An
// invoice's files are read (and deleted) through filesApi; its booked entry
// through journalEntriesApi.
export const purchaseInvoicesApi = {
  list: (filter: PurchaseInvoiceListFilter = {}) =>
    apiWithMeta<PurchaseInvoice[], ListMeta>(`/api/purchase-invoices${toQueryString(filter)}`),
  get: (id: string) => api<PurchaseInvoice>(`/api/purchase-invoices/${id}`),
  // With a file (the invoice's PDF), the invoice and the file are sent in one
  // multipart request and stored together, or not at all.
  create: (input: PurchaseInvoiceInput, file?: File) => {
    if (!file) return api<PurchaseInvoice>('/api/purchase-invoices', { method: 'POST', body: input });
    const body = new FormData();
    body.append('invoice', JSON.stringify(input));
    body.append('file', file);
    return api<PurchaseInvoice>('/api/purchase-invoices', { method: 'POST', body });
  },
  // Only while the invoice is NEW.
  update: (id: string, input: PurchaseInvoiceInput) =>
    api<PurchaseInvoice>(`/api/purchase-invoices/${id}`, { method: 'PUT', body: input }),
  // Only while the invoice is NEW or REJECTED.
  remove: (id: string) => api<void>(`/api/purchase-invoices/${id}`, { method: 'DELETE' }),
  // Approving books the invoice; NEW from APPROVED takes the booking back.
  setStatus: (id: string, change: PurchaseInvoiceStatusChange) =>
    api<PurchaseInvoice>(`/api/purchase-invoices/${id}/status`, { method: 'POST', body: change }),
  // Only while the invoice is NEW. A PDF or an image.
  attachFile: (id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return api<StoredFile>(`/api/purchase-invoices/${id}/files`, { method: 'POST', body });
  },
};
