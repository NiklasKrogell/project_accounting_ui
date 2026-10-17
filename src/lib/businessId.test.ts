import {
  finnishVatNumberOf,
  isValidFinnishBusinessId,
  isValidVatNumber,
  normalizeFinnishBusinessId,
  normalizeVatNumber,
} from './businessId';

// The same cases as the backend's tests/unit/businessId.test.ts.

test('normalizeFinnishBusinessId drops spaces, adds the hyphen and pads the old form', () => {
  expect(normalizeFinnishBusinessId('0112038-9')).toBe('0112038-9');
  expect(normalizeFinnishBusinessId(' 0112038 - 9 ')).toBe('0112038-9');
  expect(normalizeFinnishBusinessId('01120389')).toBe('0112038-9');
  expect(normalizeFinnishBusinessId('112038-9')).toBe('0112038-9');
  expect(normalizeFinnishBusinessId(' HRB 12345 ')).toBe('HRB 12345');
});

test.each(['0112038-9', '2617416-4', '1234567-1', '0737546-2', '1572860-0'])(
  'isValidFinnishBusinessId accepts %s',
  (businessId) => {
    expect(isValidFinnishBusinessId(businessId)).toBe(true);
  },
);

test('isValidFinnishBusinessId rejects a wrong check digit, a remainder of 1 and a wrong shape', () => {
  expect(isValidFinnishBusinessId('0112038-8')).toBe(false);
  // 6 * 2 = 12, and 12 mod 11 = 1: no check digit is ever issued for it.
  for (let check = 0; check <= 9; check++) {
    expect(isValidFinnishBusinessId(`0000006-${check}`)).toBe(false);
  }
  expect(isValidFinnishBusinessId('01120389')).toBe(false);
  expect(isValidFinnishBusinessId('')).toBe(false);
});

test('VAT numbers are normalized, shape-checked and derived from a Finnish business ID', () => {
  expect(normalizeVatNumber(' fi 0112 0389 ')).toBe('FI01120389');
  expect(isValidVatNumber('FI01120389')).toBe(true);
  expect(isValidVatNumber('ATU12345678')).toBe(true);
  expect(isValidVatNumber('FI')).toBe(false);
  expect(isValidVatNumber('0112038')).toBe(false);
  expect(finnishVatNumberOf('0112038-9')).toBe('FI01120389');
});
