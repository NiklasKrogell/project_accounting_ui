// Mirrors the backend balance sheet report (balance-sheet.controller.ts and
// src/lib/balanceSheet.ts). Each side is in its own sign: assets are
// debit-positive, equity and liabilities credit-positive, so totals are plain
// sums. Dates are 'YYYY-MM-DD' strings.

import type { AccountMainClass, BalanceSheetItem } from './account';
import type { StatementAccountRow, StatementAmounts } from './incomeStatement';

// Levels of the layout that hold no postings of their own.
export type BalanceSheetHeading =
  | 'INTANGIBLE_ASSETS'
  | 'TANGIBLE_ASSETS'
  | 'INVESTMENTS'
  | 'INVENTORIES'
  | 'RECEIVABLES'
  | 'LONG_TERM_RECEIVABLES'
  | 'SHORT_TERM_RECEIVABLES'
  | 'FINANCIAL_SECURITIES'
  | 'RESERVES'
  | 'LONG_TERM_LIABILITIES'
  | 'SHORT_TERM_LIABILITIES';

export interface BalanceSheetNode extends StatementAmounts {
  key: BalanceSheetItem | BalanceSheetHeading;
  accounts: StatementAccountRow[];
  // The part of the amount derived from the income statement accounts; set
  // only on the two result items of equity.
  derived: StatementAmounts | null;
  children: BalanceSheetNode[];
}

export interface BalanceSheetClass extends StatementAmounts {
  mainClass: AccountMainClass;
  // Accounts whose group has no item; `unallocated` is their sum.
  accounts: StatementAccountRow[];
  unallocated: StatementAmounts;
  items: BalanceSheetNode[];
}

export type BalanceSheetSideKey = 'ASSETS' | 'EQUITY_AND_LIABILITIES';

export interface BalanceSheetSide extends StatementAmounts {
  side: BalanceSheetSideKey;
  classes: BalanceSheetClass[];
}

export interface BalanceSheet {
  date: string;
  comparisonDate: string | null;
  // Vastaavaa, then Vastattavaa; every item of the layout in statutory order,
  // empty ones included.
  sides: BalanceSheetSide[];
  // Vastaavaa minus Vastattavaa; zero unless accounts are unclassified.
  difference: StatementAmounts;
  // Accounts with postings but no account group; on neither side.
  unclassified: StatementAccountRow[];
}

export interface BalanceSheetFilter {
  date: string;
  comparisonDate?: string;
}
