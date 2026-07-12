// Mirrors the backend account API (see prisma/models/accounting.prisma and
// the account controller's serializeAccount).

export type AccountMainClass =
  | 'REVENUE'
  | 'MATERIALS_AND_SERVICES'
  | 'PERSONNEL_EXPENSES'
  | 'DEPRECIATION'
  | 'OTHER_OPERATING_EXPENSES'
  | 'FINANCIAL_INCOME_AND_EXPENSES'
  | 'APPROPRIATIONS_AND_TAXES'
  | 'FIXED_ASSETS'
  | 'CURRENT_ASSETS'
  | 'EQUITY'
  | 'PROVISIONS'
  | 'LIABILITIES';

export interface AccountGroupRef {
  id: string;
  name: string;
  mainClass: AccountMainClass;
}

export interface Account {
  id: string;
  // Account number is a per-company string (e.g. '1900'), not a numeric id.
  number: string;
  name: string;
  accountGroupId: string | null;
  // Omitted by the serializer when the group relation wasn't loaded.
  accountGroup?: AccountGroupRef | null;
  createdAt: string;
  updatedAt: string;
}
