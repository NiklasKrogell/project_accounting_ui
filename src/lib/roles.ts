import type { Role } from '../types/auth';

// Accounting access levels within a company, lowest to highest. This file
// mirrors the backend's src/lib/roles.ts: change both together.
export const ROLE_ORDER: Role[] = ['VIEWER', 'LEDGER', 'ACCOUNTANT', 'ADMIN'];

const roleRank = (role: Role) => ROLE_ORDER.indexOf(role);

export function roleAtLeast(role: Role | undefined, min: Role): boolean {
  if (!role) return false;
  return roleRank(role) >= roleRank(min);
}

// --- Who may manage whose role ---

// What the rules look at in a member: their accounting role and whether they
// are a company administrator. The two are independent.
export interface MemberStanding {
  userId: string;
  role: Role;
  isAdmin: boolean;
}

// The roles `actor` may give another member: a company administrator any of
// them, an ACCOUNTANT or higher only those below their own, so that nobody
// can raise someone to their own level. Nobody else assigns roles.
export function assignableRoles(actor: Pick<MemberStanding, 'role' | 'isAdmin'>): Role[] {
  if (actor.isAdmin) return [...ROLE_ORDER];
  if (!roleAtLeast(actor.role, 'ACCOUNTANT')) return [];
  return ROLE_ORDER.filter((role) => roleRank(role) < roleRank(actor.role));
}

// Whether `actor` may change `target`'s role at all. Never their own. A
// company administrator anyone else's; the others only that of a member who
// is not a company administrator and whose role is below their own.
export function canManageMember(actor: MemberStanding, target: MemberStanding): boolean {
  if (actor.userId === target.userId) return false;
  if (actor.isAdmin) return true;
  return !target.isAdmin && assignableRoles(actor).includes(target.role);
}
