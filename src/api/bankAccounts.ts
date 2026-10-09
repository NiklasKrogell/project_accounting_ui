import { api } from './client';
import type { BankAccount, BankAccountInput } from '../types/bankAccount';

// Typed wrappers over the bank account endpoints. The list has the accounts in
// use first, then by name. There is no delete: a bank account is taken out of
// use (and back) by updating `isActive`.
export const bankAccountsApi = {
  list: () => api<BankAccount[]>('/api/bank-accounts'),
  create: (input: BankAccountInput) =>
    api<BankAccount>('/api/bank-accounts', { method: 'POST', body: input }),
  update: (id: string, input: BankAccountInput) =>
    api<BankAccount>(`/api/bank-accounts/${id}`, { method: 'PUT', body: input }),
};
