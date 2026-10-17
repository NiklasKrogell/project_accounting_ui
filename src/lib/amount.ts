// Euro amounts as the forms take them: text with a Finnish decimal comma.

// Accepts Finnish comma decimals ('123,45' / '-123,45'). Returns null when not a number.
export function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// An amount as an amount field shows it: 125,50 or -100,00.
export function amountText(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}
