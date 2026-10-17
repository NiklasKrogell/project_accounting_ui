// Mirrors the backend bank statement API (see bank-statement.controller.ts).
// A bank statement is a PDF the company has imported, to be booked by hand:
// nothing is read from the file, so the sums below describe what has been
// booked from it, not what the statement itself says.

import type { EntryLineType, VoucherType } from './journal';

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

// A transaction of the statement, imported from the bank's CSV export of the
// account (see the backend's src/lib/bankCsv.ts). It is booked into one
// journal entry; journalEntry is that entry, null while it is unbooked.
export interface BankStatementLine {
  id: string;
  position: number;
  bookingDate: string;
  valueDate: string | null;
  // Signed: + money in, - money out.
  amount: number;
  counterparty: string;
  counterpartyAccount: string;
  reference: string;
  message: string;
  transactionType: string;
  archiveId: string | null;
  journalEntry: { id: string; voucherType: VoucherType; voucherNumber: number } | null;
}

// What a column of the CSV can be. The amount is one signed column or a pair:
// money in and money out.
export const CSV_FIELDS = [
  'bookingDate',
  'amount',
  'amountIn',
  'amountOut',
  'counterparty',
  'counterpartyAccount',
  'reference',
  'message',
  'transactionType',
  'archiveId',
  'valueDate',
] as const;
export type CsvField = (typeof CSV_FIELDS)[number];

// The columns (by index) each field is read from. A date or an amount comes
// from one column; text may come from several.
export type CsvMapping = Partial<Record<CsvField, number[]>>;

export type CsvLayout = 'op' | 'nordea' | 'nordea-classic';

export interface CsvPreviewLine {
  // The row's line in the file.
  lineNumber: number;
  bookingDate: string;
  valueDate: string | null;
  amount: number;
  counterparty: string;
  counterpartyAccount: string;
  reference: string;
  message: string;
  transactionType: string;
  archiveId: string | null;
  // Already imported to a statement of the same bank account: not imported
  // again.
  duplicate: boolean;
}

export type CsvSkipReason = 'pending' | 'no-date' | 'no-amount' | 'currency';

// What importing a file would do, with the columns it was read with: the
// guessed ones, or those sent along.
export interface CsvPreview {
  // A layout recognised by name; null for any other file.
  layout: CsvLayout | null;
  encoding: string;
  delimiter: string;
  // The header's column names (#1, #2… when the file has none).
  columns: string[];
  mapping: CsvMapping;
  // Set when the mapping lacks the date or the amount; no lines then.
  mappingProblem: string | null;
  lines: CsvPreviewLine[];
  skipped: Array<{ lineNumber: number; reason: CsvSkipReason }>;
  // The account the file says it is of, when that is not the statement's.
  accountMismatch: string | null;
}

export interface CsvImportResult {
  imported: number;
  duplicates: number;
  skipped: number;
}
