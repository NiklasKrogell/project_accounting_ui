// Mirrors the backend purchase invoice API (see purchase-invoice.controller.ts
// and the backend CLAUDE.md, "Suppliers & purchase invoices"). Dates are
// 'YYYY-MM-DD' strings; amounts are euro decimals.

import type { StoredFile } from './file';
import type { VatBasis } from './journal';

// NEW until approved (or rejected); approving books the invoice, PAID is only
// a mark on an approved one.
export type PurchaseInvoiceStatus = 'NEW' | 'APPROVED' | 'PAID' | 'REJECTED';

// Stable order for selects and filters.
export const PURCHASE_INVOICE_STATUSES: PurchaseInvoiceStatus[] = [
  'NEW',
  'APPROVED',
  'PAID',
  'REJECTED',
];

// A row of the invoice: the cost side of its booking. Stored net, with its
// VAT, like a journal entry line; the debt to the supplier is implied.
export interface PurchaseInvoiceLine {
  id: string;
  accountId: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  description: string;
  costCenterId: string | null;
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  supplier: { id: string; name: string };
  // The supplier's own number for the invoice; unique per supplier.
  invoiceNumber: string;
  paymentReference: string | null;
  invoiceDate: string;
  // The date the purchase is booked on when the invoice is approved.
  entryDate: string;
  dueDate: string;
  // The total including VAT as typed from the invoice. The rows must come to
  // it (grossTotal) before the invoice can be approved.
  totalAmount: number;
  iban: string | null;
  bic: string | null;
  description: string;
  // How the rows were entered; their amounts are stored net either way.
  vatBasis: VatBasis;
  status: PurchaseInvoiceStatus;
  // What the rows come to.
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  // The PURCHASE entry booking it, while APPROVED or PAID.
  journalEntryId: string | null;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  rejectedById: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  paidById: string | null;
  paidAt: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  lines: PurchaseInvoiceLine[];
  fileCount: number;
  // Only when the invoice is read on its own; a list row has the count only.
  files?: StoredFile[];
}

// A row as entered: net or gross according to the invoice's vatBasis.
export interface PurchaseInvoiceLineInput {
  accountId: string;
  amount: number;
  vatRate: number;
  description?: string;
  costCenterId?: string | null;
}

// Create and update both send the whole invoice (the update is a PUT).
export interface PurchaseInvoiceInput {
  supplierId: string;
  invoiceNumber: string;
  paymentReference: string | null;
  invoiceDate: string;
  entryDate: string;
  dueDate: string;
  totalAmount: number;
  iban: string | null;
  bic: string | null;
  description: string;
  vatBasis: VatBasis;
  lines: PurchaseInvoiceLineInput[];
}

export type PurchaseInvoiceStatusChange =
  | { status: 'APPROVED' }
  | { status: 'REJECTED'; reason?: string }
  | { status: 'PAID'; paymentDate: string }
  | { status: 'NEW' };

// The columns the list can be sorted by.
export type PurchaseInvoiceSortField =
  | 'invoiceNumber'
  | 'supplier'
  | 'paymentReference'
  | 'invoiceDate'
  | 'dueDate'
  | 'totalAmount'
  | 'status';

export type SortOrder = 'asc' | 'desc';

export interface PurchaseInvoiceListFilter {
  // Any of these; all statuses when empty.
  statuses?: PurchaseInvoiceStatus[];
  supplierId?: string;
  // Both ends of each range are inclusive.
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  dueFrom?: string;
  dueTo?: string;
  // Matched against the invoice number, the supplier's name, the payment
  // reference and the typed total.
  search?: string;
  // By due date, earliest first, when left out.
  sort?: PurchaseInvoiceSortField;
  order?: SortOrder;
  take?: number;
  skip?: number;
}
