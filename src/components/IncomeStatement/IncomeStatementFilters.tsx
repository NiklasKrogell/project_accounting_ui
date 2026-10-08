import { useTranslation } from 'react-i18next';
import { Card, CardContent, FormControlLabel, MenuItem, Switch, TextField } from '@mui/material';
import { costCenterLabel, type CostCenter } from '../../types/costCenter';
import type { FiscalYear } from '../../types/fiscal';
import { formatDateRange } from '../../lib/format';

interface IncomeStatementFiltersProps {
  fiscalYears: FiscalYear[];
  from: string;
  to: string;
  costCenterId: string;
  costCenters: CostCenter[];
  showAccounts: boolean;
  grossResult: boolean;
  lang: string;
  onPeriodChange: (from: string, to: string) => void;
  onCostCenterChange: (value: string) => void;
  onShowAccountsChange: (value: boolean) => void;
  onGrossResultChange: (value: boolean) => void;
}

const CUSTOM = 'custom';

// Period and presentation controls. The fiscal year select is a shortcut that
// fills both dates; its value is derived from them, so hand-edited dates that
// no longer match a fiscal year show as a custom period rather than leaving a
// stale year selected.
export function IncomeStatementFilters({
  fiscalYears,
  from,
  to,
  costCenterId,
  costCenters,
  showAccounts,
  grossResult,
  lang,
  onPeriodChange,
  onCostCenterChange,
  onShowAccountsChange,
  onGrossResultChange,
}: IncomeStatementFiltersProps) {
  const { t } = useTranslation();
  const selected = fiscalYears.find((fy) => fy.startDate === from && fy.endDate === to);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          select
          size="small"
          label={t('incomeStatement.filters.fiscalYear')}
          value={selected?.id ?? CUSTOM}
          onChange={(e) => {
            const fy = fiscalYears.find((year) => year.id === e.target.value);
            if (fy) onPeriodChange(fy.startDate, fy.endDate);
          }}
          sx={{ minWidth: 240 }}
        >
          {fiscalYears.map((fy) => (
            <MenuItem key={fy.id} value={fy.id}>
              {formatDateRange(fy.startDate, fy.endDate, lang)}
            </MenuItem>
          ))}
          {/* Only a display value: picking it would not say which dates. */}
          <MenuItem value={CUSTOM} disabled>
            {t('incomeStatement.filters.customPeriod')}
          </MenuItem>
        </TextField>
        <TextField
          type="date"
          size="small"
          label={t('incomeStatement.filters.from')}
          value={from}
          onChange={(e) => onPeriodChange(e.target.value, to)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          size="small"
          label={t('incomeStatement.filters.to')}
          value={to}
          onChange={(e) => onPeriodChange(from, e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          select
          size="small"
          label={t('incomeStatement.filters.costCenter')}
          value={costCenterId}
          onChange={(e) => onCostCenterChange(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">{t('incomeStatement.filters.allCostCenters')}</MenuItem>
          {costCenters.map((costCenter) => (
            <MenuItem key={costCenter.id} value={costCenter.id}>
              {costCenterLabel(costCenter)}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showAccounts}
              onChange={(e) => onShowAccountsChange(e.target.checked)}
            />
          }
          label={t('incomeStatement.filters.showAccounts')}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={grossResult}
              onChange={(e) => onGrossResultChange(e.target.checked)}
            />
          }
          label={t('incomeStatement.filters.grossResult')}
        />
      </CardContent>
    </Card>
  );
}
