import {
  formatPaymentReference,
  isValidPaymentReference,
  normalizePaymentReference,
} from './paymentReference';

// The same cases as the backend's tests/unit/paymentReference.test.ts.

test('normalizePaymentReference strips whitespace and upper-cases', () => {
  expect(normalizePaymentReference(' 12 3456 1 ')).toBe('1234561');
  expect(normalizePaymentReference('rf18 5390 0754 7034')).toBe('RF18539007547034');
});

test.each(['12344', '1234561', '10003', '98765432103', 'RF18539007547034', 'RF712348231'])(
  'accepts %s',
  (reference) => {
    expect(isValidPaymentReference(reference)).toBe(true);
  },
);

test.each(['12345', '1234562', '136', '1'.repeat(21), '12A44', 'RF19539007547034', 'RF18', 'RFXX539007547034'])(
  'rejects %s',
  (reference) => {
    expect(isValidPaymentReference(reference)).toBe(false);
  },
);

test('formatPaymentReference groups a Finnish reference by fives from the right', () => {
  expect(formatPaymentReference('12344')).toBe('12344');
  expect(formatPaymentReference('1234561')).toBe('12 34561');
  expect(formatPaymentReference('98765432103')).toBe('9 87654 32103');
});

test('formatPaymentReference groups an RF reference by fours from the left', () => {
  expect(formatPaymentReference('RF18539007547034')).toBe('RF18 5390 0754 7034');
  expect(formatPaymentReference('RF712348231')).toBe('RF71 2348 231');
});
