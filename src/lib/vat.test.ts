import { vatCents } from './vat';

describe('vatCents', () => {
  it('computes VAT on a net amount', () => {
    expect(vatCents(10000, 25.5)).toBe(2550);
    expect(vatCents(10000, 13.5)).toBe(1350);
    expect(vatCents(10000, 10)).toBe(1000);
    expect(vatCents(10000, 0)).toBe(0);
  });

  it('rounds a half cent up rather than losing it to binary rounding', () => {
    // 1,00 x 25,5 % = 0,255: multiplying by 0.255 gives 25.499999999999996.
    expect(vatCents(100, 25.5)).toBe(26);
    expect(vatCents(300, 13.5)).toBe(41);
  });

  it('rounds to the nearest cent otherwise', () => {
    expect(vatCents(1999, 25.5)).toBe(510);
    expect(vatCents(333, 10)).toBe(33);
  });
});
