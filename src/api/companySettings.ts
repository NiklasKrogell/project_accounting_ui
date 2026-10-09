import { api } from './client';
import type { CompanySettings, CompanySettingsPatch } from '../types/settings';

// Typed wrappers over the company settings endpoints. They act on the active
// company; everyone in it can read them, changing them requires ACCOUNTANT+.
// The update is partial and returns the full settings.
export const companySettingsApi = {
  get: () => api<CompanySettings>('/api/settings/company'),
  update: (patch: CompanySettingsPatch) =>
    api<CompanySettings>('/api/settings/company', { method: 'PATCH', body: patch }),
};
