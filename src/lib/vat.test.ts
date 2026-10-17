import { formatVatRate, splitVatCents, vatCents, vatCentsInGross } from './vat';

describe('formatVatRate', () => {
  it('writes the rate with a decimal comma', () => {
    expect(formatVatRate(25.5)).toBe('25,5 %');
    expect(formatVatRate(10)).toBe('10 %');
    expect(formatVatRate(0)).toBe('0 %');
  });
});

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

describe('vatCentsInGross', () => {
  it('computes the VAT contained in a gross amount', () => {
    expect(vatCentsInGross(12550, 25.5)).toBe(2550);
    expect(vatCentsInGross(11350, 13.5)).toBe(1350);
    expect(vatCentsInGross(10000, 0)).toBe(0);
  });

  it('rounds to the nearest cent', () => {
    expect(vatCentsInGross(1000, 25.5)).toBe(203);
    // Not the same as VAT on the net: 15,86 net would give 4,04.
    expect(vatCentsInGross(1991, 25.5)).toBe(405);
  });
});

describe('splitVatCents', () => {
  it('adds the VAT on top of a net amount', () => {
    expect(splitVatCents(10000, 25.5, 'net')).toEqual({ net: 10000, vat: 2550 });
  });

  it('takes the VAT out of a gross amount, the two adding up to it', () => {
    expect(splitVatCents(12550, 25.5, 'gross')).toEqual({ net: 10000, vat: 2550 });
    const { net, vat } = splitVatCents(1999, 25.5, 'gross');
    expect(net + vat).toBe(1999);
  });
});
