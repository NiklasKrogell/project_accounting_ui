// Formats a 'YYYY-MM-DD' date string for display in the given locale (e.g.
// fi -> 31.12.2025, en -> 12/31/2025). Parsed as UTC to avoid timezone drift.
export function formatDate(iso: string, lang: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateRange(startIso: string, endIso: string, lang: string): string {
  return `${formatDate(startIso, lang)} – ${formatDate(endIso, lang)}`;
}

// Formats a euro amount for display (fi -> 1 234,56 €, en -> €1,234.56).
export function formatCurrency(amount: number, lang: string): string {
  return new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(amount);
}
