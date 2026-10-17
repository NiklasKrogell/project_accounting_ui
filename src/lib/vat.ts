// Mirrors the backend's VAT arithmetic (src/lib/vat.ts there), which is what
// actually posts the VAT rows — the dialog only previews them, so the two must
// round identically.

// The Finnish VAT rates: what a journal entry line can be given, and what an
// account can be given as its default. The backend accepts the same ones as an
// account's default (VAT_RATES in src/lib/vat.ts there) — change both together.
export const VAT_RATES = [25.5, 13.5, 10, 0];

// '25,5 %': a rate the Finnish way, with a decimal comma.
export function formatVatRate(rate: number): string {
  return `${String(rate).replace('.', ',')} %`;
}

// VAT in cents on a net amount in cents. The rate is a percentage taken to two
// decimals (25.5 -> 2550), which keeps the product an integer: multiplying by
// 0.255 instead would put a half cent just under .5 and round it down.
export function vatCents(netCents: number, vatRate: number): number {
  return Math.round((netCents * Math.round(vatRate * 100)) / 10000);
}

// VAT in cents contained in a gross amount in cents.
export function vatCentsInGross(grossCents: number, vatRate: number): number {
  const rate = Math.round(vatRate * 100);
  return Math.round((grossCents * rate) / (10000 + rate));
}

// Splits an entered amount in cents into its net amount and VAT in cents,
// like the backend's splitVat does before it stores a line: on a net basis the
// VAT is added on top, on a gross basis it is taken out of the amount.
export function splitVatCents(
  cents: number,
  vatRate: number,
  basis: 'net' | 'gross',
): { net: number; vat: number } {
  if (basis === 'gross') {
    const vat = vatCentsInGross(cents, vatRate);
    return { net: cents - vat, vat };
  }
  return { net: cents, vat: vatCents(cents, vatRate) };
}
