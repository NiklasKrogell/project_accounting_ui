// IBAN and BIC handling. normalizeIban, isValidIban, normalizeBic and
// isValidBic mirror the backend's src/lib/iban.ts, so change both together.

// IBANs are stored and compared without spaces, in upper case.
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

// Expects a normalized IBAN. Checks the general shape (country code, two check
// digits, 11-30 characters of account identifier) and the ISO 13616 mod-97
// checksum. Country-specific lengths are not checked.
export function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  // Move the country code and check digits to the end, read letters as
  // numbers (A = 10 ... Z = 35) and take the result modulo 97 a digit at a
  // time, since the full number does not fit a JS number.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged.split('')) {
    const digits = char >= 'A' ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits.split('')) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

// For display: groups of four, e.g. "FI21 1234 5600 0007 85".
export function formatIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
}

// BICs (SWIFT codes) are stored like IBANs: without spaces, in upper case.
export function normalizeBic(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

// Expects a normalized BIC. ISO 9362: four letters of institution, a country
// code, two characters of location and an optional three of branch. A BIC has
// no check digits, so the shape is all there is to check.
export function isValidBic(bic: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
}
