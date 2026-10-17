import { api } from './client';
import type { Supplier, SupplierInput } from '../types/supplier';

// Typed wrappers over the supplier endpoints. The list is ordered by name.
// Deleting a supplier that has purchase invoices fails with 409.
export const suppliersApi = {
  list: () => api<Supplier[]>('/api/suppliers'),
  create: (input: SupplierInput) => api<Supplier>('/api/suppliers', { method: 'POST', body: input }),
  update: (id: string, input: SupplierInput) =>
    api<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => api<void>(`/api/suppliers/${id}`, { method: 'DELETE' }),
};
