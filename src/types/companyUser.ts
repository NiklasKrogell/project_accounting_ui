// Mirrors the backend's company users API (see company-user.service.ts): the
// members of the active company, as the "users and roles" settings show them.
import type { Role } from './auth';
import type { CompanyInvitation } from './invitation';

export interface CompanyUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  // The accounting access level, and whether the member is a company
  // administrator. The two are independent.
  role: Role;
  isAdmin: boolean;
  joinedAt: string;
  // Still on the temporary password the account was created with.
  pendingFirstLogin: boolean;
}

export interface CompanyUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isAdmin?: boolean;
}

// Only the fields sent are changed.
export interface CompanyUserPatch {
  role?: Role;
  isAdmin?: boolean;
}

// What adding a user led to. An email without an account gets one and is a
// member at once; the account comes with a temporary password, returned this
// once. An email that already had an account is not made a member but sent an
// invitation, which its user answers in their inbox: no password, and the name
// given is ignored in favour of the account's own.
export type CompanyUserCreated =
  | { member: CompanyUser; temporaryPassword: string; invitation: null }
  | { member: null; temporaryPassword: null; invitation: CompanyInvitation };
