// VAT in cents on a net amount in cents. Mirrors the backend's vatCents
// (src/lib/vat.ts there), which is what actually posts the VAT rows — the
// dialog only previews them, so the two must round identically. The rate is a
// percentage taken to two decimals (25.5 -> 2550), which keeps the product an
// integer: multiplying by 0.255 instead would put a half cent just under .5
// and round it down.
export function vatCents(amountCents: number, vatRate: number): number {
  return Math.round((amountCents * Math.round(vatRate * 100)) / 10000);
}
