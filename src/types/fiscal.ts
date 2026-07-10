// Mirrors the backend fiscal-year API (see prisma/models/fiscal.prisma and the
// fiscal-year controller). Dates are 'YYYY-MM-DD' strings.

export type FiscalYearStatus = 'OPEN' | 'CLOSED';
export type PeriodStatus = 'OPEN' | 'CLOSED';
export type PeriodGranularity = 'MONTH' | 'QUARTER';

export interface AccountingPeriod {
  id: string;
  fiscalYearId: string;
  index: number;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closedAt: string | null;
}

export interface FiscalYear {
  id: string;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  granularity: PeriodGranularity;
  closedAt: string | null;
  periods: AccountingPeriod[];
}

export interface CreateFiscalYearInput {
  startDate: string;
  endDate: string;
  granularity: PeriodGranularity;
}
