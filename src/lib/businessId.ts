// Business IDs and VAT numbers of suppliers. These mirror the backend's
// src/lib/businessId.ts, which refuses what fails them, so change both
// together. A Finnish business ID (Y-tunnus) has a check digit; another
// country's is free text. Finland's VAT number is derived from the business
// ID, so the two are checked against each other.

// The canonical form of a Finnish business ID is seven digits, a hyphen and
// the check digit (1234567-8). Spaces are dropped, the hyphen may be left out,
// and the old six-digit form (123456-7) gets the leading zero it has today.
// Anything else is returned trimmed, for isValidFinnishBusinessId to refuse.
export function normalizeFinnishBusinessId(value: string): string {
  const compact = value.replace(/\s+/g, '');
  const match = /^(\d{6,7})-?(\d)$/.exec(compact);
  if (!match) return value.trim();
  return `${match[1].padStart(7, '0')}-${match[2]}`;
}

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2];

// Expects a normalized business ID. The check digit is 11 minus the remainder
// of the weighted sum modulo 11, or 0 when the remainder is 0; a remainder of
// 1 is never issued.
export function isValidFinnishBusinessId(businessId: string): boolean {
  const match = /^(\d{7})-(\d)$/.exec(businessId);
  if (!match) return false;
  const sum = match[1].split('').reduce((s, digit, i) => s + Number(digit) * WEIGHTS[i], 0);
  const remainder = sum % 11;
  if (remainder === 1) return false;
  return (remainder === 0 ? 0 : 11 - remainder) === Number(match[2]);
}

// VAT numbers are stored without spaces, dots or hyphens, in upper case.
export function normalizeVatNumber(value: string): string {
  return value.replace(/[\s.-]+/g, '').toUpperCase();
}

// Expects a normalized VAT number: a two-letter country prefix and 2-13
// characters. Only the shape common to all countries is checked.
export function isValidVatNumber(vatNumber: string): boolean {
  return /^[A-Z]{2}[A-Z0-9+*]{2,13}$/.test(vatNumber);
}

// The VAT number a Finnish business ID gives: FI and its eight digits.
export function finnishVatNumberOf(businessId: string): string {
  return `FI${businessId.replace('-', '')}`;
}
