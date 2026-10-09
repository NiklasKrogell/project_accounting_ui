// Mirrors the backend bank account API (see bank-account.controller.ts). The
// IBAN is stored without spaces, in upper case, and is unique within a company.

export interface BankAccount {
  id: string;
  name: string;
  iban: string;
  // The accounting account the bank account's transactions are booked on.
  accountId: string;
  // False once the bank account has been taken out of use. Bank accounts are
  // never deleted.
  isActive: boolean;
  account?: { id: string; number: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// The update endpoint is a full replace (PUT), except for `isActive`, which is
// left as it is when omitted. A new bank account is always in use.
export interface BankAccountInput {
  name: string;
  iban: string;
  accountId: string;
  isActive?: boolean;
}
