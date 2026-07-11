// Mirrors the backend's Role/SubscriptionStatus enums (prisma/models) and the
// shapes returned by /api/auth/me.

export type Role = 'VIEWER' | 'LEDGER' | 'ACCOUNTANT' | 'ADMIN';
export type SubscriptionStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

export interface SignupInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  businessId: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;
  phone?: string;
}

export interface MeResponse {
  user: User;
  memberships: Membership[];
  activeCompanyId: string | null;
}

export interface AuthState {
  loading: boolean;
  user: User | null;
  memberships: Membership[];
  activeCompanyId: string | null;
}

export interface AuthContextValue extends AuthState {
  activeMembership: Membership | null;
  login(email: string, password: string): Promise<void>;
  signup(input: SignupInput): Promise<void>;
  logout(): Promise<void>;
  switchCompany(companyId: string): Promise<void>;
}
