import { api } from './client';
import type { AccountGroup } from '../types/account';

// Typed wrappers over the account group endpoints. The list endpoint returns
// each group with its accounts, ordered by main class then group name.
export const accountGroupsApi = {
  list: () => api<AccountGroup[]>('/api/account-groups'),
};
