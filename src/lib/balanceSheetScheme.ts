import type { AccountMainClass, BalanceSheetItem } from '../types/account';
import type { BalanceSheetHeading } from '../types/balanceSheet';

// The part of the statutory balance sheet layout (PMA 1753/2015, Annex V) the
// UI needs for classifying account groups: which items each lettered section
// has, in what order, and under which heading. Mirrors the backend's
// src/lib/balanceSheetScheme.ts. The report itself needs none of the structure
// — the balance sheet endpoint returns the layout already assembled — only the
// label helpers at the bottom.

export interface BalanceSheetItemOption {
  key: BalanceSheetItem;
  // The heading the item sits under in the layout. On its own an item's label
  // ("Muut saamiset", "Ennakkomaksut") doesn't say which one it is.
  parent?: BalanceSheetHeading;
}

type Maturity = 'LONG_TERM' | 'SHORT_TERM';

const under = (parent: BalanceSheetHeading, keys: BalanceSheetItem[]): BalanceSheetItemOption[] =>
  keys.map((key) => ({ key, parent }));

// Receivables and liabilities have the same numbered items in their long-term
// and short-term halves.
const RECEIVABLES = [
  'TRADE_RECEIVABLES',
  'RECEIVABLES_FROM_GROUP_UNDERTAKINGS',
  'RECEIVABLES_FROM_PARTICIPATING_INTERESTS',
  'LOAN_RECEIVABLES',
  'OTHER_RECEIVABLES',
  'UNPAID_SHARES',
  'PREPAYMENTS_AND_ACCRUED_INCOME',
] as const;

const LIABILITIES = [
  'BONDS',
  'CONVERTIBLE_BONDS',
  'LOANS_FROM_FINANCIAL_INSTITUTIONS',
  'PENSION_LOANS',
  'ADVANCES_RECEIVED',
  'TRADE_PAYABLES',
  'BILLS_OF_EXCHANGE_PAYABLE',
  'LIABILITIES_TO_GROUP_UNDERTAKINGS',
  'LIABILITIES_TO_PARTICIPATING_INTERESTS',
  'OTHER_LIABILITIES',
  'ACCRUALS_AND_DEFERRED_INCOME',
] as const;

const receivables = (maturity: Maturity): BalanceSheetItemOption[] =>
  under(
    `${maturity}_RECEIVABLES`,
    RECEIVABLES.map((name): BalanceSheetItem => `${maturity}_${name}`),
  );

const liabilities = (maturity: Maturity): BalanceSheetItemOption[] =>
  under(
    `${maturity}_LIABILITIES`,
    LIABILITIES.map((name): BalanceSheetItem => `${maturity}_${name}`),
  );

const ITEMS: Partial<Record<AccountMainClass, readonly BalanceSheetItemOption[]>> = {
  FIXED_ASSETS: [
    ...under('INTANGIBLE_ASSETS', [
      'DEVELOPMENT_EXPENDITURE',
      'INTANGIBLE_RIGHTS',
      'GOODWILL',
      'OTHER_INTANGIBLE_ASSETS',
      'INTANGIBLE_ADVANCE_PAYMENTS',
    ]),
    ...under('TANGIBLE_ASSETS', [
      'LAND_AND_WATERS',
      'BUILDINGS_AND_STRUCTURES',
      'MACHINERY_AND_EQUIPMENT',
      'OTHER_TANGIBLE_ASSETS',
      'TANGIBLE_ADVANCE_PAYMENTS_AND_CONSTRUCTION_IN_PROGRESS',
    ]),
    ...under('INVESTMENTS', [
      'INVESTMENT_HOLDINGS_IN_GROUP_UNDERTAKINGS',
      'INVESTMENT_RECEIVABLES_FROM_GROUP_UNDERTAKINGS',
      'INVESTMENT_PARTICIPATING_INTERESTS',
      'INVESTMENT_RECEIVABLES_FROM_PARTICIPATING_INTERESTS',
      'INVESTMENT_OTHER_SHARES_AND_HOLDINGS',
      'INVESTMENT_OTHER_RECEIVABLES',
    ]),
  ],
  CURRENT_ASSETS: [
    ...under('INVENTORIES', [
      'RAW_MATERIALS_AND_CONSUMABLES',
      'WORK_IN_PROGRESS',
      'FINISHED_GOODS',
      'OTHER_INVENTORIES',
      'INVENTORY_ADVANCE_PAYMENTS',
    ]),
    ...receivables('LONG_TERM'),
    ...receivables('SHORT_TERM'),
    ...under('FINANCIAL_SECURITIES', [
      'SECURITIES_HOLDINGS_IN_GROUP_UNDERTAKINGS',
      'SECURITIES_OTHER_SHARES_AND_HOLDINGS',
      'OTHER_SECURITIES',
    ]),
    { key: 'CASH_AND_BANK' },
  ],
  EQUITY: [
    { key: 'SHARE_CAPITAL' },
    { key: 'SHARE_PREMIUM_RESERVE' },
    { key: 'REVALUATION_RESERVE' },
    ...under('RESERVES', [
      'INVESTED_UNRESTRICTED_EQUITY_RESERVE',
      'RESERVE_FUND',
      'RESERVES_UNDER_ARTICLES',
      'FAIR_VALUE_RESERVE',
      'OTHER_RESERVES',
    ]),
    { key: 'RETAINED_EARNINGS' },
    { key: 'PROFIT_FOR_THE_FINANCIAL_YEAR' },
  ],
  ACCUMULATED_APPROPRIATIONS: [{ key: 'DEPRECIATION_DIFFERENCE' }, { key: 'TAX_BASED_PROVISIONS' }],
  PROVISIONS: [{ key: 'PENSION_PROVISIONS' }, { key: 'TAX_PROVISIONS' }, { key: 'OTHER_PROVISIONS' }],
  LIABILITIES: [...liabilities('LONG_TERM'), ...liabilities('SHORT_TERM')],
};

const NO_ITEMS: readonly BalanceSheetItemOption[] = [];

// Items a group of this main class may be classified as, in statutory order;
// empty for income statement classes.
export function balanceSheetItemOptions(
  mainClass: AccountMainClass,
): readonly BalanceSheetItemOption[] {
  return ITEMS[mainClass] ?? NO_ITEMS;
}

const MATURITY_HEADINGS: ReadonlySet<string> = new Set([
  'LONG_TERM_RECEIVABLES',
  'SHORT_TERM_RECEIVABLES',
  'LONG_TERM_LIABILITIES',
  'SHORT_TERM_LIABILITIES',
]);

// Label of an item or heading as it reads on the balance sheet. The long-term
// and short-term variants of an item share one translation: the heading above
// them says which half they are in.
export function balanceSheetLabel(
  key: BalanceSheetItem | BalanceSheetHeading,
  t: (key: string) => string,
): string {
  const name = MATURITY_HEADINGS.has(key) ? key : key.replace(/^(LONG|SHORT)_TERM_/, '');
  return t(`balanceSheetItem.${name}`);
}

// Display label of an item outside the balance sheet, where it has no heading
// above it to give it context.
export function balanceSheetItemLabel(item: BalanceSheetItem, t: (key: string) => string): string {
  const own = balanceSheetLabel(item, t);
  for (const options of Object.values(ITEMS)) {
    const parent = options?.find((option) => option.key === item)?.parent;
    if (parent) return `${balanceSheetLabel(parent, t)} – ${own.toLowerCase()}`;
  }
  return own;
}
