// Mirrors the backend journal-entry API (see prisma/models/accounting.prisma
// and the journal-entry controller). Dates are 'YYYY-MM-DD' strings; amounts
// are euro decimals (the backend balances debits vs credits in cents).

export type VoucherType = 'SALES' | 'PURCHASE' | 'PAYMENT' | 'EXPENSE' | 'WAGE' | 'MEMOVOUCHER';

// Stable order for selects and filters.
export const VOUCHER_TYPES: VoucherType[] = [
  'SALES',
  'PURCHASE',
  'PAYMENT',
  'EXPENSE',
  'WAGE',
  'MEMOVOUCHER',
];

export type EntryLineType = 'debit' | 'credit';

// How the line amounts of an entry being saved relate to VAT: 'net' amounts
// exclude it (the VAT is added on top), 'gross' amounts include it (the VAT is
// taken out of the amount). Lines are stored net either way, so this is part
// of the request only.
export type VatBasis = 'net' | 'gross';

export interface JournalEntryLine {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  vatRate: number;
  vatAmount: number;
  type: EntryLineType;
  // True for a row the backend generated on a VAT account from another line's
  // VAT; such rows are never sent back when saving an entry.
  isVat: boolean;
  costCenterId: string | null;
}

export interface JournalEntry {
  id: string;
  voucherType: VoucherType;
  voucherNumber: number;
  date: string;
  description: string;
  accountId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lines: JournalEntryLine[];
}

// An entered line. Whether the amount is net of VAT or includes it is the
// entry's vatBasis; the backend derives the VAT and posts it as a row of its
// own, and the entry must balance with those rows counted. vatRate is
// required — send 0 when not applicable.
export interface JournalEntryLineInput {
  accountId: string;
  amount: number;
  description?: string;
  vatRate: number;
  type: EntryLineType;
  // Optional; omitted or null leaves the line without a cost center.
  costCenterId?: string | null;
}

export interface CreateJournalEntryInput {
  voucherType: VoucherType;
  date: string;
  description: string;
  accountId: string;
  // Net when omitted.
  vatBasis?: VatBasis;
  // Whether the backend generates the VAT rows; on when omitted. Off, the
  // lines are stored and balanced as entered and the VAT is booked by hand.
  automaticVat?: boolean;
  lines: JournalEntryLineInput[];
}

// voucherType is immutable after creation, so updates omit it.
export type UpdateJournalEntryInput = Omit<CreateJournalEntryInput, 'voucherType'>;

export interface JournalEntryListFilter {
  from?: string;
  to?: string;
  voucherType?: VoucherType;
  take?: number;
  skip?: number;
}

export interface ListMeta {
  total: number;
  take: number;
  skip: number;
}
