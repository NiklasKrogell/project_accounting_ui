import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { invitationsApi } from '../api/invitations';
import { userSettingsApi } from '../api/userSettings';
import { changeLanguage } from '../i18n';
import type { AuthContextValue, AuthState, MeResponse, SignupInput } from '../types/auth';
import type { UserSettingsPatch } from '../types/settings';

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGGED_OUT: AuthState = {
  loading: false,
  user: null,
  settings: null,
  invitations: [],
  memberships: [],
  activeCompanyId: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...LOGGED_OUT, loading: true });

  const refresh = useCallback(async () => {
    try {
      const me = await api<MeResponse>('/api/auth/me');
      setState({
        loading: false,
        user: me.user,
        settings: me.settings,
        invitations: me.invitations,
        memberships: me.memberships,
        activeCompanyId: me.activeCompanyId,
      });
    } catch {
      // 401 (or network failure) -> logged out
      setState(LOGGED_OUT);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The inbox fills up without the user doing anything, so it is re-read on
  // its own. Not through refresh(): that takes any failure for being logged
  // out, which a passing network error on the way back to the tab must not do.
  const refreshInvitations = useCallback(async () => {
    try {
      const invitations = await invitationsApi.list();
      setState((current) => (current.user ? { ...current, invitations } : current));
    } catch {
      // The list already shown is the best there is.
    }
  }, []);

  // A user on a temporary password is answered by the auth routes only.
  const hasInbox = state.user !== null && !state.user.mustChangePassword;
  useEffect(() => {
    if (!hasInbox) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshInvitations();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [hasInbox, refreshInvitations]);

  // The language is a user setting, so the saved one wins as soon as it is
  // known. changeLanguage also caches it in this browser, which is what the
  // logged-out pages (and the first paint) use.
  const language = state.settings?.language;
  useEffect(() => {
    if (language) changeLanguage(language);
  }, [language]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      activeMembership:
        state.memberships.find((m) => m.companyId === state.activeCompanyId) ?? null,

      async login(email: string, password: string) {
        await api('/api/auth/login', { method: 'POST', body: { email, password } });
        await refresh();
      },

      async signup(input: SignupInput) {
        await api('/api/auth/signup', { method: 'POST', body: input });
        await refresh();
      },

      async logout() {
        await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
        await refresh();
      },

      async changePassword(currentPassword: string, newPassword: string) {
        await api('/api/auth/change-password', {
          method: 'POST',
          body: { currentPassword, newPassword },
        });
        // user.mustChangePassword is cleared by the change.
        await refresh();
      },

      async switchCompany(companyId: string) {
        await api('/api/auth/switch-company', { method: 'POST', body: { companyId } });
        await refresh();
      },

      refreshSession: refresh,
      refreshInvitations,

      async updateUserSettings(patch: UserSettingsPatch) {
        const settings = await userSettingsApi.update(patch);
        setState((current) => ({ ...current, settings }));
      },
    }),
    [state, refresh, refreshInvitations],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
