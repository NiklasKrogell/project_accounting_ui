import type { Role } from '../types/auth';

// Accounting access levels within a company, lowest to highest. Mirrors the
// backend ROLE_ORDER (src/middleware/requireRole.ts).
const ROLE_ORDER: Role[] = ['VIEWER', 'LEDGER', 'ACCOUNTANT', 'ADMIN'];

export function roleAtLeast(role: Role | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}
