import { api } from './client';
import type { Account, AccountMainClass } from '../types/account';

export interface AccountListFilter {
  accountGroupId?: string;
  mainClass?: AccountMainClass;
  search?: string;
}

// Typed wrappers over the account endpoints (chart of accounts).
export const accountsApi = {
  list: (filter: AccountListFilter = {}) => {
    const params = new URLSearchParams();
    if (filter.accountGroupId) params.set('accountGroupId', filter.accountGroupId);
    if (filter.mainClass) params.set('mainClass', filter.mainClass);
    if (filter.search) params.set('search', filter.search);
    const qs = params.toString();
    return api<Account[]>(`/api/accounts${qs ? `?${qs}` : ''}`);
  },
};
