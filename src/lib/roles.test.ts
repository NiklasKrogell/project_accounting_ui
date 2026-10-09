import type { Role } from '../types/auth';
import { assignableRoles, canManageMember, roleAtLeast, ROLE_ORDER } from './roles';

const member = (role: Role, isAdmin = false, userId = `${role}-${isAdmin}`) => ({
  userId,
  role,
  isAdmin,
});

test('roleAtLeast compares along the role order', () => {
  expect(roleAtLeast('ACCOUNTANT', 'LEDGER')).toBe(true);
  expect(roleAtLeast('LEDGER', 'LEDGER')).toBe(true);
  expect(roleAtLeast('VIEWER', 'LEDGER')).toBe(false);
  expect(roleAtLeast(undefined, 'VIEWER')).toBe(false);
});

test('assignableRoles gives a company administrator every role, whatever their own', () => {
  for (const role of ROLE_ORDER) {
    expect(assignableRoles({ role, isAdmin: true })).toEqual(ROLE_ORDER);
  }
});

test('assignableRoles gives an accountant or higher the roles below their own, the rest none', () => {
  expect(assignableRoles({ role: 'VIEWER', isAdmin: false })).toEqual([]);
  expect(assignableRoles({ role: 'LEDGER', isAdmin: false })).toEqual([]);
  expect(assignableRoles({ role: 'ACCOUNTANT', isAdmin: false })).toEqual(['VIEWER', 'LEDGER']);
  expect(assignableRoles({ role: 'ADMIN', isAdmin: false })).toEqual([
    'VIEWER',
    'LEDGER',
    'ACCOUNTANT',
  ]);
});

test('canManageMember lets a company administrator manage everyone but themselves', () => {
  const admin = member('VIEWER', true, 'me');
  for (const role of ROLE_ORDER) {
    expect(canManageMember(admin, member(role))).toBe(true);
    expect(canManageMember(admin, member(role, true))).toBe(true);
  }
  expect(canManageMember(admin, admin)).toBe(false);
});

test.each<[Role, Role[]]>([
  ['VIEWER', []],
  ['LEDGER', []],
  ['ACCOUNTANT', ['VIEWER', 'LEDGER']],
  ['ADMIN', ['VIEWER', 'LEDGER', 'ACCOUNTANT']],
])('canManageMember lets %s manage only the members below them', (actorRole, manageable) => {
  const actor = member(actorRole, false, 'me');
  for (const targetRole of ROLE_ORDER) {
    expect(canManageMember(actor, member(targetRole))).toBe(manageable.includes(targetRole));
  }
  // Never a company administrator, nor themselves.
  expect(canManageMember(actor, member('VIEWER', true))).toBe(false);
  expect(canManageMember(actor, member('VIEWER', false, 'me'))).toBe(false);
});
