import type { Language } from '../i18n';

// A user's personal settings, mirroring the backend's
// src/services/user-settings.service.ts. They belong to the user, not to a
// company, so they stay the same when the active company changes. Settings of
// the company itself are not kept here — see src/pages/Settings.tsx.
export interface UserSettings {
  language: Language;
}

// The update is partial (PATCH): only the settings sent are changed.
export type UserSettingsPatch = Partial<UserSettings>;
