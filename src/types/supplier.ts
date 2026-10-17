// Mirrors the backend supplier API (see supplier.controller.ts). The bank
// details, the default account and the default VAT rate only prefill a new
// purchase invoice and its rows; the backend never copies them onto one.

export interface Supplier {
  id: string;
  name: string;
  // A Finnish one (country FI) is a Y-tunnus in the form 1234567-8; another
  // country's is free text. Unique within a company when given.
  businessId: string | null;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  // ISO 3166-1 alpha-2.
  country: string;
  iban: string | null;
  bic: string | null;
  defaultAccountId: string | null;
  defaultAccount: { id: string; number: string; name: string } | null;
  // One of VAT_RATES (src/lib/vat.ts), or null for none.
  defaultVatRate: number | null;
  createdAt: string;
  updatedAt: string;
}

// The update endpoint is a full replace (PUT): a field left null is cleared.
export interface SupplierInput {
  name: string;
  businessId: string | null;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  iban: string | null;
  bic: string | null;
  defaultAccountId: string | null;
  defaultVatRate: number | null;
}
