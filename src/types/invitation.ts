// Mirrors the backend's invitation API (company-invitation.service.ts). A user
// who already has an account is not added to a company but invited to it, and
// answers in their inbox. An invitation exists only while it is pending.
import type { Role } from './auth';

// An invitation as it waits in the invited user's inbox.
export interface Invitation {
  id: string;
  companyId: string;
  companyName: string;
  businessId: string;
  // What the user gets on accepting: the accounting access level, and whether
  // they become a company administrator.
  role: Role;
  isAdmin: boolean;
  // The administrator who sent it; null once they no longer have an account.
  invitedBy: string | null;
  createdAt: string;
}

// A pending invitation as the inviting company's "users and roles" settings
// show it.
export interface CompanyInvitation {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isAdmin: boolean;
  invitedBy: string | null;
  createdAt: string;
}
