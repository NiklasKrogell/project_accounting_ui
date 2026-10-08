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

export interface JournalEntryLine {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  vatRate: number;
  vatAmount: number;
  type: EntryLineType;
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

// vatRate and vatAmount are required by the backend schema — send 0 when not applicable.
export interface JournalEntryLineInput {
  accountId: string;
  amount: number;
  description?: string;
  vatRate: number;
  vatAmount: number;
  type: EntryLineType;
  // Optional; omitted or null leaves the line without a cost center.
  costCenterId?: string | null;
}

export interface CreateJournalEntryInput {
  voucherType: VoucherType;
  date: string;
  description: string;
  accountId: string;
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
