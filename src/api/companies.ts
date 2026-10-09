import { api } from './client';
import type { SubscriptionStatus } from '../types/auth';
import type { CompanyInfo } from '../types/settings';

export interface CompanyCreated {
  id: string;
  name: string;
  subscriptionStatus: SubscriptionStatus;
}

// Typed wrapper over registering a company. Any logged-in user may: they
// become the new company's administrator, and the backend makes it the
// session's active company, so follow a create with useAuth().refreshSession().
export const companiesApi = {
  create: (input: CompanyInfo) => api<CompanyCreated>('/api/companies', { method: 'POST', body: input }),
};
