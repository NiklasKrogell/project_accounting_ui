import { api } from './client';
import type { CostCenter, CostCenterInput } from '../types/costCenter';

// Typed wrappers over the cost center endpoints. The list is ordered by code.
// Deleting a cost center that is used on a journal entry line fails with 409.
export const costCentersApi = {
  list: () => api<CostCenter[]>('/api/cost-centers'),
  create: (input: CostCenterInput) =>
    api<CostCenter>('/api/cost-centers', { method: 'POST', body: input }),
  update: (id: string, input: CostCenterInput) =>
    api<CostCenter>(`/api/cost-centers/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => api<void>(`/api/cost-centers/${id}`, { method: 'DELETE' }),
};
