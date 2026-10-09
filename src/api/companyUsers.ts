import { api } from './client';
import type {
  CompanyUser,
  CompanyUserCreated,
  CompanyUserInput,
  CompanyUserPatch,
} from '../types/companyUser';

const BASE = '/api/settings/company/users';

// Typed wrappers over the active company's users endpoints. Everyone reads the
// list; adding, removing and issuing a temporary password are for company
// administrators; whose role may be changed, and to what, follows the rules in
// src/lib/roles.ts. A new temporary password is refused (409) once the user
// has set a password of their own, or belongs to another company too.
export const companyUsersApi = {
  list: () => api<CompanyUser[]>(BASE),
  create: (input: CompanyUserInput) =>
    api<CompanyUserCreated>(BASE, { method: 'POST', body: input }),
  update: (userId: string, patch: CompanyUserPatch) =>
    api<CompanyUser>(`${BASE}/${userId}`, { method: 'PATCH', body: patch }),
  remove: (userId: string) => api<void>(`${BASE}/${userId}`, { method: 'DELETE' }),
  resetTemporaryPassword: (userId: string) =>
    api<{ temporaryPassword: string }>(`${BASE}/${userId}/temporary-password`, { method: 'POST' }),
};
