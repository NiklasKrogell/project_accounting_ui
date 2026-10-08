import { useTranslation } from 'react-i18next';
import { Card, CardContent, FormControlLabel, MenuItem, Switch, TextField } from '@mui/material';
import type { FiscalYear } from '../../types/fiscal';
import { formatDateRange } from '../../lib/format';

interface BalanceSheetFiltersProps {
  fiscalYears: FiscalYear[];
  date: string;
  showAccounts: boolean;
  abridged: boolean;
  lang: string;
  onDateChange: (date: string) => void;
  onShowAccountsChange: (value: boolean) => void;
  onAbridgedChange: (value: boolean) => void;
}

const CUSTOM = 'custom';

// Date and presentation controls. The fiscal year select is a shortcut that
// sets the date to the year's last day; its value is derived from the date,
// so a hand-edited date that is no fiscal year's end shows as a custom date
// rather than leaving a stale year selected.
export function BalanceSheetFilters({
  fiscalYears,
  date,
  showAccounts,
  abridged,
  lang,
  onDateChange,
  onShowAccountsChange,
  onAbridgedChange,
}: BalanceSheetFiltersProps) {
  const { t } = useTranslation();
  const selected = fiscalYears.find((fy) => fy.endDate === date);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          select
          size="small"
          label={t('balanceSheet.filters.fiscalYear')}
          value={selected?.id ?? CUSTOM}
          onChange={(e) => {
            const fy = fiscalYears.find((year) => year.id === e.target.value);
            if (fy) onDateChange(fy.endDate);
          }}
          sx={{ minWidth: 240 }}
        >
          {fiscalYears.map((fy) => (
            <MenuItem key={fy.id} value={fy.id}>
              {formatDateRange(fy.startDate, fy.endDate, lang)}
            </MenuItem>
          ))}
          {/* Only a display value: picking it would not say which date. */}
          <MenuItem value={CUSTOM} disabled>
            {t('balanceSheet.filters.customDate')}
          </MenuItem>
        </TextField>
        <TextField
          type="date"
          size="small"
          label={t('balanceSheet.filters.date')}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              // The abridged layout has no items to show accounts under.
              checked={showAccounts && !abridged}
              disabled={abridged}
              onChange={(e) => onShowAccountsChange(e.target.checked)}
            />
          }
          label={t('balanceSheet.filters.showAccounts')}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={abridged}
              onChange={(e) => onAbridgedChange(e.target.checked)}
            />
          }
          label={t('balanceSheet.filters.abridged')}
        />
      </CardContent>
    </Card>
  );
}
