import type { Language } from '../i18n';

// A user's personal settings, mirroring the backend's
// src/services/user-settings.service.ts. They belong to the user, not to a
// company, so they stay the same when the active company changes. Settings of
// the company itself are CompanySettings below — see src/pages/Settings.tsx.
export interface UserSettings {
  language: Language;
}

// The update is partial (PATCH): only the settings sent are changed.
export type UserSettingsPatch = Partial<UserSettings>;

// Settings of the active company's books, mirroring the backend's
// src/services/company-settings.service.ts. They are the same for everyone
// working in the company and change with the active company.
export interface CompanySettings {
  // Whether the company is registered for VAT. When it is not, the backend
  // refuses a journal entry line with a VAT rate.
  vatRegistered: boolean;
}

export type CompanySettingsPatch = Partial<CompanySettings>;
