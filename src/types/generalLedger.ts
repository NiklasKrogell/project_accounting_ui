// Mirrors the backend general-ledger API (see general-ledger.controller.ts).
// Dates are 'YYYY-MM-DD' strings; amounts are euro decimals.
//
// Balances follow the backend's DEBIT-POSITIVE convention
// (balance = debits - credits), so credit-nature accounts (revenue,
// liabilities, equity) report negative balances.

import type { AccountGroupRef } from './account';
import type { VoucherType } from './journal';

export interface GeneralLedgerLine {
  id: string;
  entryId: string;
  date: string;
  voucherType: VoucherType;
  voucherNumber: number;
  // The entry's own description, shown alongside the line's.
  entryDescription: string;
  description: string;
  costCenterId: string | null;
  // Exactly one of these is non-zero; the backend has already split the
  // line's side, so the view needs no sign logic.
  debit: number;
  credit: number;
  vatRate: number;
  vatAmount: number;
  runningBalance: number;
}

export interface GeneralLedgerAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  // Always present; null for an account that belongs to no group.
  accountGroup: AccountGroupRef | null;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  lineCount: number;
  lines: GeneralLedgerLine[];
}

// take/skip page over ACCOUNTS, not lines, so meta.total is a count of
// accounts and an account's lines always arrive whole.
export interface GeneralLedgerFilter {
  from?: string;
  to?: string;
  accountId?: string;
  // Narrows lines, opening balances and totals to one cost center.
  costCenterId?: string;
  take?: number;
  skip?: number;
}
