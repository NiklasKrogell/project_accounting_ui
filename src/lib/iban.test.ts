import { formatIban, isValidIban, normalizeIban } from './iban';

test('normalizeIban strips whitespace and upper-cases', () => {
  expect(normalizeIban(' fi21 1234 5600 0007 85 ')).toBe('FI2112345600000785');
});

test.each([
  'FI2112345600000785',
  'DE89370400440532013000',
  'GB82WEST12345698765432',
  'FR1420041010050500013M02606',
  'NO9386011117947',
])('isValidIban accepts %s', (iban) => {
  expect(isValidIban(iban)).toBe(true);
});

test('isValidIban rejects a wrong checksum or shape', () => {
  expect(isValidIban('FI2212345600000785')).toBe(false);
  expect(isValidIban('FI2112345600000758')).toBe(false);
  expect(isValidIban('')).toBe(false);
  expect(isValidIban('FI21')).toBe(false);
  expect(isValidIban('not-an-iban')).toBe(false);
  // Not normalized.
  expect(isValidIban('FI21 1234 5600 0007 85')).toBe(false);
});

test('formatIban groups by four', () => {
  expect(formatIban('FI2112345600000785')).toBe('FI21 1234 5600 0007 85');
  expect(formatIban('fi21 12345600000785')).toBe('FI21 1234 5600 0007 85');
  expect(formatIban('NO9386011117947')).toBe('NO93 8601 1117 947');
});
