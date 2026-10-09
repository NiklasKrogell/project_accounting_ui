import { api } from './client';
import type { CompanyInvitation, Invitation } from '../types/invitation';

const INBOX = '/api/invitations';
const COMPANY = '/api/settings/company/invitations';

// Typed wrappers over the logged-in user's inbox. It belongs to the user, not
// to a company, and answers one who has no company at all. Accepting makes the
// user a member (and, for a session without an active company, takes them into
// it), so follow it with useAuth().refreshSession(). An invitation that was
// cancelled or answered meanwhile is refused with 404.
export const invitationsApi = {
  list: () => api<Invitation[]>(INBOX),
  accept: (id: string) => api<{ companyId: string }>(`${INBOX}/${id}/accept`, { method: 'POST' }),
  decline: (id: string) => api<void>(`${INBOX}/${id}/decline`, { method: 'POST' }),
};

// Typed wrappers over the active company's pending invitations. Everyone in
// the company reads them; cancelling one is for company administrators. One is
// sent by adding a user whose email already has an account (companyUsersApi).
export const companyInvitationsApi = {
  list: () => api<CompanyInvitation[]>(COMPANY),
  cancel: (id: string) => api<void>(`${COMPANY}/${id}`, { method: 'DELETE' }),
};
