import { api } from './client';
import type {
  AccountGroup,
  AccountMainClass,
  BalanceSheetItem,
  IncomeStatementSubItem,
} from '../types/account';

// The update endpoint is a full replace (PUT): a sub-item or balance sheet
// item left out is cleared.
export interface AccountGroupInput {
  name: string;
  mainClass: AccountMainClass;
  incomeStatementSubItem: IncomeStatementSubItem | null;
  balanceSheetItem: BalanceSheetItem | null;
}

// Typed wrappers over the account group endpoints. The list endpoint returns
// each group with its accounts, ordered by main class then group name.
export const accountGroupsApi = {
  list: () => api<AccountGroup[]>('/api/account-groups'),
  create: (input: AccountGroupInput) =>
    api<AccountGroup>('/api/account-groups', { method: 'POST', body: input }),
  update: (id: string, input: AccountGroupInput) =>
    api<AccountGroup>(`/api/account-groups/${id}`, { method: 'PUT', body: input }),
};
