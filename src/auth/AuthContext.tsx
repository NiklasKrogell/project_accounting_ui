import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { AuthContextValue, AuthState, MeResponse, SignupInput } from '../types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    memberships: [],
    activeCompanyId: null,
  });

  const refresh = useCallback(async () => {
    try {
      const me = await api<MeResponse>('/api/auth/me');
      setState({
        loading: false,
        user: me.user,
        memberships: me.memberships,
        activeCompanyId: me.activeCompanyId,
      });
    } catch {
      // 401 (or network failure) -> logged out
      setState({ loading: false, user: null, memberships: [], activeCompanyId: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

      async switchCompany(companyId: string) {
        await api('/api/auth/switch-company', { method: 'POST', body: { companyId } });
        await refresh();
      },
    }),
    [state, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
