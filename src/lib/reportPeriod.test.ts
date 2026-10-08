import { comparisonRange, defaultFiscalYear } from './reportPeriod';

const fy = (startDate: string, endDate: string) => ({ startDate, endDate });

describe('comparisonRange', () => {
  const years = [fy('2025-01-01', '2025-12-31'), fy('2023-07-01', '2024-12-31')];

  it('compares a whole fiscal year against the fiscal year before it', () => {
    // The earlier year is eighteen months long; a calendar shift would miss it.
    expect(comparisonRange('2025-01-01', '2025-12-31', years)).toEqual({
      from: '2023-07-01',
      to: '2024-12-31',
    });
  });

  it('picks the closest earlier fiscal year when there are several', () => {
    const three = [...years, fy('2022-07-01', '2023-06-30')];
    expect(comparisonRange('2025-01-01', '2025-12-31', three).from).toBe('2023-07-01');
  });

  it('shifts the first fiscal year back one calendar year', () => {
    expect(comparisonRange('2023-07-01', '2024-12-31', years)).toEqual({
      from: '2022-07-01',
      to: '2023-12-31',
    });
  });

  it('shifts a custom range back one calendar year', () => {
    expect(comparisonRange('2025-03-01', '2025-03-15', years)).toEqual({
      from: '2024-03-01',
      to: '2024-03-15',
    });
  });

  it('keeps a month-end on the month-end across a leap year', () => {
    expect(comparisonRange('2025-02-01', '2025-02-28', [])).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
    expect(comparisonRange('2024-02-01', '2024-02-29', [])).toEqual({
      from: '2023-02-01',
      to: '2023-02-28',
    });
  });

  it('clamps a 29 February start date', () => {
    expect(comparisonRange('2024-02-29', '2024-03-10', []).from).toBe('2023-02-28');
  });
});

describe('defaultFiscalYear', () => {
  const years = [fy('2025-01-01', '2025-12-31'), fy('2024-01-01', '2024-12-31')];

  it('prefers the fiscal year containing today', () => {
    expect(defaultFiscalYear(years, '2024-06-01')).toEqual(years[1]);
    expect(defaultFiscalYear(years, '2025-12-31')).toEqual(years[0]);
  });

  it('falls back to the most recent fiscal year', () => {
    expect(defaultFiscalYear(years, '2026-10-08')).toEqual(years[0]);
    expect(defaultFiscalYear([...years].reverse(), '2026-10-08')).toEqual(years[0]);
  });

  it('returns null when there are no fiscal years', () => {
    expect(defaultFiscalYear([], '2026-10-08')).toBeNull();
  });
});
