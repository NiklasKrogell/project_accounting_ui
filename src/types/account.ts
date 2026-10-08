// Mirrors the backend account API (see prisma/models/accounting.prisma and
// the account controller's serializeAccount).

// Income statement classes come first, in the order of the statutory layout
// (PMA 1753/2015, Annex I); see src/lib/incomeStatementScheme.ts.
export type AccountMainClass =
  | 'REVENUE'
  | 'CHANGE_IN_FINISHED_GOODS_INVENTORIES'
  | 'PRODUCTION_FOR_OWN_USE'
  | 'OTHER_OPERATING_INCOME'
  | 'MATERIALS_AND_SERVICES'
  | 'PERSONNEL_EXPENSES'
  | 'DEPRECIATION'
  | 'OTHER_OPERATING_EXPENSES'
  | 'FINANCIAL_INCOME_AND_EXPENSES'
  | 'APPROPRIATIONS'
  | 'INCOME_TAXES'
  | 'OTHER_DIRECT_TAXES'
  | 'FIXED_ASSETS'
  | 'CURRENT_ASSETS'
  | 'EQUITY'
  | 'PROVISIONS'
  | 'LIABILITIES';

// Lettered sub-items of the statutory income statement layout. A group may be
// classified as one that belongs to its main class.
export type IncomeStatementSubItem =
  | 'PURCHASES'
  | 'CHANGE_IN_INVENTORIES'
  | 'EXTERNAL_SERVICES'
  | 'WAGES_AND_SALARIES'
  | 'PENSION_EXPENSES'
  | 'OTHER_SOCIAL_SECURITY_EXPENSES'
  | 'PLANNED_DEPRECIATION'
  | 'IMPAIRMENT_OF_FIXED_ASSETS'
  | 'EXCEPTIONAL_IMPAIRMENT_OF_CURRENT_ASSETS'
  | 'INCOME_FROM_GROUP_UNDERTAKINGS'
  | 'INCOME_FROM_PARTICIPATING_INTERESTS'
  | 'INCOME_FROM_OTHER_FIXED_ASSET_INVESTMENTS'
  | 'INCOME_FROM_OTHER_FIXED_ASSET_INVESTMENTS_GROUP_UNDERTAKINGS'
  | 'OTHER_INTEREST_AND_FINANCIAL_INCOME'
  | 'OTHER_INTEREST_AND_FINANCIAL_INCOME_GROUP_UNDERTAKINGS'
  | 'IMPAIRMENT_OF_FIXED_ASSET_INVESTMENTS'
  | 'IMPAIRMENT_OF_CURRENT_ASSET_SECURITIES'
  | 'INTEREST_AND_OTHER_FINANCIAL_EXPENSES'
  | 'INTEREST_AND_OTHER_FINANCIAL_EXPENSES_GROUP_UNDERTAKINGS'
  | 'CHANGE_IN_DEPRECIATION_DIFFERENCE'
  | 'CHANGE_IN_TAX_BASED_PROVISIONS'
  | 'GROUP_CONTRIBUTION';

export interface AccountGroupRef {
  id: string;
  name: string;
  mainClass: AccountMainClass;
  incomeStatementSubItem: IncomeStatementSubItem | null;
}

export interface AccountGroup {
  id: string;
  name: string;
  mainClass: AccountMainClass;
  incomeStatementSubItem: IncomeStatementSubItem | null;
  // Included by the list endpoint, omitted when the relation wasn't loaded.
  accounts?: Account[];
  createdAt: string;
  updatedAt: string;
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
