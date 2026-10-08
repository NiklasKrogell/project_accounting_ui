// Period helpers for reports. All dates are 'YYYY-MM-DD' strings, which
// compare correctly as plain strings.

export interface PeriodLike {
  startDate: string;
  endDate: string;
}

export interface DateRange {
  from: string;
  to: string;
}

function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// The same calendar date one year earlier. A month-end stays a month-end when
// `keepMonthEnd` is set (28 Feb 2025 -> 29 Feb 2024), so a period that ends
// with its month still does; otherwise only 29 Feb needs clamping.
function oneYearEarlier(iso: string, keepMonthEnd: boolean): string {
  const [year, month, day] = iso.split('-').map(Number);
  const targetDays = daysInMonth(year - 1, month);
  const isMonthEnd = day === daysInMonth(year, month);
  return toIso(year - 1, month, keepMonthEnd && isMonthEnd ? targetDays : Math.min(day, targetDays));
}

// The period a report's figures are compared against.
//
// When the range is exactly a fiscal year, that is the fiscal year before it:
// fiscal years are not always twelve months (a first or changed one may be up
// to eighteen), so shifting by a calendar year would compare against the wrong
// dates. Any other range, or a first fiscal year, is shifted back one year.
export function comparisonRange(
  from: string,
  to: string,
  fiscalYears: readonly PeriodLike[],
): DateRange {
  const isFiscalYear = fiscalYears.some((fy) => fy.startDate === from && fy.endDate === to);
  if (isFiscalYear) {
    const previous = fiscalYears
      .filter((fy) => fy.endDate < from)
      .reduce<PeriodLike | null>(
        (latest, fy) => (latest === null || fy.endDate > latest.endDate ? fy : latest),
        null,
      );
    if (previous) return { from: previous.startDate, to: previous.endDate };
  }
  return { from: oneYearEarlier(from, false), to: oneYearEarlier(to, true) };
}

// The date a balance sheet's figures are compared against.
//
// When the date closes a fiscal year, that is the closing date of the fiscal
// year before it (the comparison the financial statements make), for the same
// reason as above. Any other date, or the end of a first fiscal year, is
// shifted back one year.
export function comparisonDate(date: string, fiscalYears: readonly PeriodLike[]): string {
  const closed = fiscalYears.find((fy) => fy.endDate === date);
  if (closed) {
    const previous = fiscalYears
      .filter((fy) => fy.endDate < closed.startDate)
      .reduce<PeriodLike | null>(
        (latest, fy) => (latest === null || fy.endDate > latest.endDate ? fy : latest),
        null,
      );
    if (previous) return previous.endDate;
  }
  return oneYearEarlier(date, true);
}

// The fiscal year a report opens on: the one containing `today`, else the most
// recent one, else none.
export function defaultFiscalYear<T extends PeriodLike>(
  fiscalYears: readonly T[],
  today: string,
): T | null {
  const current = fiscalYears.find((fy) => fy.startDate <= today && today <= fy.endDate);
  if (current) return current;
  return fiscalYears.reduce<T | null>(
    (latest, fy) => (latest === null || fy.startDate > latest.startDate ? fy : latest),
    null,
  );
}

// Today's calendar date in the browser's time zone.
export function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
