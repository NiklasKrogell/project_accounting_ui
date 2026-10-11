// Mirrors the backend bank statement API (see bank-statement.controller.ts).
// A bank statement is a PDF the company has imported, to be booked by hand:
// nothing is read from the file, so the sums below describe what has been
// booked from it, not what the statement itself says.

import type { EntryLineType } from './journal';

export interface BankStatement {
  id: string;
  // The user's own mark; it locks nothing.
  posted: boolean;
  // The bank account the statement is of; null until one is chosen.
  bankAccountId: string | null;
  // accountId is the accounting account the bank account is booked on.
  bankAccount: { id: string; name: string; iban: string; accountId: string } | null;
  // The PDF. Its bytes are read through the file API with this id.
  file: { id: string; originalName: string; size: number };
  // How many journal entries have been booked from the statement.
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankStatementListFilter {
  // Only the posted or only the unposted ones; all when omitted.
  posted?: boolean;
  take?: number;
  skip?: number;
}

// Both optional: what is omitted is left as it is. Null takes the bank account
// off.
export interface BankStatementPatch {
  bankAccountId?: string | null;
  posted?: boolean;
}

// The lines of one VAT rate on one side: debit lines are purchases (their VAT
// is receivable), credit lines sales (payable).
export interface BankStatementVatRate {
  vatRate: number;
  side: EntryLineType;
  base: number;
  vat: number;
}

export interface BankStatementSummary {
  // What the entries moved on the bank account's accounting account; null
  // while the statement has no bank account.
  bank: { deposits: number; withdrawals: number; net: number } | null;
  vat: {
    receivable: number;
    payable: number;
    byRate: BankStatementVatRate[];
  };
}
