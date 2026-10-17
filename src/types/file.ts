// A stored file of the company, mirroring serializeFile in the backend's
// stored-file.controller.ts. Its bytes are read through filesApi.content.

export interface StoredFile {
  id: string;
  originalName: string;
  // Detected from the content when the file was uploaded: a PDF or an image.
  mimeType: string;
  size: number;
  sha256: string;
  // The voucher the file documents, if any.
  journalEntryId: string | null;
  // The purchase invoice the file belongs to, if any.
  purchaseInvoiceId: string | null;
  uploadedById: string;
  createdAt: string;
}
