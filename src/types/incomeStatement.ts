// Mirrors the backend income statement report (income-statement.controller.ts
// and src/lib/incomeStatement.ts). Amounts are credit-positive: income is
// positive, expenses negative, so totals are plain sums. Dates are
// 'YYYY-MM-DD' strings.

import type { AccountMainClass, IncomeStatementSubItem } from './account';

export interface DateRange {
  from: string;
  to: string;
}

// comparisonAmount is null throughout when no comparison period was requested.
export interface StatementAmounts {
  amount: number;
  comparisonAmount: number | null;
}

export interface StatementAccountRow extends StatementAmounts {
  accountId: string;
  accountNumber: string;
  accountName: string;
}

// Grouping levels of the layout that hold no postings of their own.
export type SubItemHeading = 'MATERIALS_SUPPLIES_AND_GOODS' | 'SOCIAL_SECURITY_EXPENSES';

export interface StatementSubItem extends StatementAmounts {
  key: IncomeStatementSubItem | SubItemHeading;
  accounts: StatementAccountRow[];
  children: StatementSubItem[];
}

export type IncomeStatementSubtotal =
  | 'OPERATING_PROFIT'
  | 'PROFIT_BEFORE_APPROPRIATIONS_AND_TAXES'
  | 'PROFIT_FOR_THE_FINANCIAL_YEAR';

export interface StatementItemRow extends StatementAmounts {
  kind: 'item';
  mainClass: AccountMainClass;
  // Accounts whose group has no sub-item; `unallocated` is their sum.
  accounts: StatementAccountRow[];
  unallocated: StatementAmounts;
  subItems: StatementSubItem[];
  inGrossResult: boolean;
}

export interface StatementSubtotalRow extends StatementAmounts {
  kind: 'subtotal';
  key: IncomeStatementSubtotal;
}

export type StatementRow = StatementItemRow | StatementSubtotalRow;

export interface IncomeStatement {
  period: DateRange;
  comparison: DateRange | null;
  // Every item of the layout in statutory order, empty ones included.
  rows: StatementRow[];
  // Items 1-5 combined ("Bruttotulos").
  grossResult: StatementAmounts;
  // Accounts with postings but no account group; in no total.
  unclassified: StatementAccountRow[];
}

export interface IncomeStatementFilter {
  period: DateRange;
  comparison?: DateRange;
}
