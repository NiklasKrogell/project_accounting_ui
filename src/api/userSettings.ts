import { api } from './client';
import type { UserSettings, UserSettingsPatch } from '../types/settings';

// Typed wrappers over the user settings endpoints. They act on the logged-in
// user regardless of the active company, and the update returns the full
// settings. Components save through useAuth().updateUserSettings, which also
// applies the change to the running app.
export const userSettingsApi = {
  get: () => api<UserSettings>('/api/settings/user'),
  update: (patch: UserSettingsPatch) =>
    api<UserSettings>('/api/settings/user', { method: 'PATCH', body: patch }),
};
