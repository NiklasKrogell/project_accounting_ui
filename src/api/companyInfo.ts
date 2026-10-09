import { api } from './client';
import type { CompanyInfo, CompanyInfoPatch } from '../types/settings';

// Typed wrappers over the company info endpoints. They act on the active
// company; everyone in it can read them, changing them requires being one of
// its company administrators. The update is partial and returns the full info.
export const companyInfoApi = {
  get: () => api<CompanyInfo>('/api/settings/company/info'),
  update: (patch: CompanyInfoPatch) =>
    api<CompanyInfo>('/api/settings/company/info', { method: 'PATCH', body: patch }),
};
