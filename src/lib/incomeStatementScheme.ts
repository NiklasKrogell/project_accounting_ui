import type { AccountMainClass, IncomeStatementSubItem } from '../types/account';

// The part of the statutory income statement layout (PMA 1753/2015, Annex I)
// the UI needs for classifying account groups: which main classes exist, in
// what order, and which lettered sub-items each one has. Mirrors the backend's
// src/lib/incomeStatementScheme.ts. The report itself needs none of this — the
// income statement endpoint returns the layout already assembled.

// All main classes in display order (the backend enum order).
export const MAIN_CLASSES: readonly AccountMainClass[] = [
  'REVENUE',
  'CHANGE_IN_FINISHED_GOODS_INVENTORIES',
  'PRODUCTION_FOR_OWN_USE',
  'OTHER_OPERATING_INCOME',
  'MATERIALS_AND_SERVICES',
  'PERSONNEL_EXPENSES',
  'DEPRECIATION',
  'OTHER_OPERATING_EXPENSES',
  'FINANCIAL_INCOME_AND_EXPENSES',
  'APPROPRIATIONS',
  'INCOME_TAXES',
  'OTHER_DIRECT_TAXES',
  'FIXED_ASSETS',
  'CURRENT_ASSETS',
  'EQUITY',
  'PROVISIONS',
  'LIABILITIES',
];

export interface SubItemOption {
  key: IncomeStatementSubItem;
  // Set for the "group undertakings" parts of financial items: on its own the
  // part's label ("Saman konsernin yrityksiltä") doesn't say what it is part of.
  parent?: IncomeStatementSubItem;
}

const SUB_ITEMS: Partial<Record<AccountMainClass, readonly SubItemOption[]>> = {
  MATERIALS_AND_SERVICES: [
    { key: 'PURCHASES' },
    { key: 'CHANGE_IN_INVENTORIES' },
    { key: 'EXTERNAL_SERVICES' },
  ],
  PERSONNEL_EXPENSES: [
    { key: 'WAGES_AND_SALARIES' },
    { key: 'PENSION_EXPENSES' },
    { key: 'OTHER_SOCIAL_SECURITY_EXPENSES' },
  ],
  DEPRECIATION: [
    { key: 'PLANNED_DEPRECIATION' },
    { key: 'IMPAIRMENT_OF_FIXED_ASSETS' },
    { key: 'EXCEPTIONAL_IMPAIRMENT_OF_CURRENT_ASSETS' },
  ],
  FINANCIAL_INCOME_AND_EXPENSES: [
    { key: 'INCOME_FROM_GROUP_UNDERTAKINGS' },
    { key: 'INCOME_FROM_PARTICIPATING_INTERESTS' },
    { key: 'INCOME_FROM_OTHER_FIXED_ASSET_INVESTMENTS' },
    {
      key: 'INCOME_FROM_OTHER_FIXED_ASSET_INVESTMENTS_GROUP_UNDERTAKINGS',
      parent: 'INCOME_FROM_OTHER_FIXED_ASSET_INVESTMENTS',
    },
    { key: 'OTHER_INTEREST_AND_FINANCIAL_INCOME' },
    {
      key: 'OTHER_INTEREST_AND_FINANCIAL_INCOME_GROUP_UNDERTAKINGS',
      parent: 'OTHER_INTEREST_AND_FINANCIAL_INCOME',
    },
    { key: 'IMPAIRMENT_OF_FIXED_ASSET_INVESTMENTS' },
    { key: 'IMPAIRMENT_OF_CURRENT_ASSET_SECURITIES' },
    { key: 'INTEREST_AND_OTHER_FINANCIAL_EXPENSES' },
    {
      key: 'INTEREST_AND_OTHER_FINANCIAL_EXPENSES_GROUP_UNDERTAKINGS',
      parent: 'INTEREST_AND_OTHER_FINANCIAL_EXPENSES',
    },
  ],
  APPROPRIATIONS: [
    { key: 'CHANGE_IN_DEPRECIATION_DIFFERENCE' },
    { key: 'CHANGE_IN_TAX_BASED_PROVISIONS' },
    { key: 'GROUP_CONTRIBUTION' },
  ],
};

const NO_SUB_ITEMS: readonly SubItemOption[] = [];

// Sub-items a group of this main class may be classified as, in statutory
// order; empty when the class has none.
export function subItemOptions(mainClass: AccountMainClass): readonly SubItemOption[] {
  return SUB_ITEMS[mainClass] ?? NO_SUB_ITEMS;
}

// Display label of a sub-item outside the statement, where a "group
// undertakings" part has no parent row above it to give it context.
export function subItemLabel(
  subItem: IncomeStatementSubItem,
  t: (key: string) => string,
): string {
  const own = t(`incomeStatementSubItem.${subItem}`);
  for (const options of Object.values(SUB_ITEMS)) {
    const parent = options?.find((option) => option.key === subItem)?.parent;
    if (parent) return `${t(`incomeStatementSubItem.${parent}`)} – ${own.toLowerCase()}`;
  }
  return own;
}
