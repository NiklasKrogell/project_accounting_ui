// Mirrors the backend's Role/SubscriptionStatus enums (prisma/models) and the
// shapes returned by /api/auth/me.
import type { Invitation } from './invitation';
import type { UserSettings, UserSettingsPatch } from './settings';

export type Role = 'VIEWER' | 'LEDGER' | 'ACCOUNTANT' | 'ADMIN';
export type SubscriptionStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // True for an account a company administrator created with a temporary
  // password, until its user has set a password of their own. The backend
  // answers such a user with nothing but the auth routes.
  mustChangePassword: boolean;
  phone: string | null;
  emailVerifiedAt: string | null;
  lastLogged: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  companyId: string;
  companyName: string;
  role: Role;
  isAdmin: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt: string | null;
}

// Signing up registers the person only. A company is registered afterwards
// (src/api/companies.ts), or the user is added to one by its administrator.
export interface SignupInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface MeResponse {
  user: User;
  settings: UserSettings;
  invitations: Invitation[];
  memberships: Membership[];
  activeCompanyId: string | null;
}

export interface AuthState {
  loading: boolean;
  user: User | null;
  // The user's personal settings; null while logged out.
  settings: UserSettings | null;
  // The user's inbox: invitations to companies waiting for their answer.
  invitations: Invitation[];
  memberships: Membership[];
  activeCompanyId: string | null;
}

export interface AuthContextValue extends AuthState {
  activeMembership: Membership | null;
  login(email: string, password: string): Promise<void>;
  signup(input: SignupInput): Promise<void>;
  logout(): Promise<void>;
  // Replaces the logged-in user's own password (and with it a temporary one).
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  switchCompany(companyId: string): Promise<void>;
  // Re-reads the session (user, settings, memberships) from the backend, for
  // when something shown from it was changed elsewhere, e.g. a company's name.
  refreshSession(): Promise<void>;
  // Re-reads only the inbox, which changes without the user doing anything.
  // Unlike refreshSession, a failure leaves everything as it was.
  refreshInvitations(): Promise<void>;
  updateUserSettings(patch: UserSettingsPatch): Promise<void>;
}
