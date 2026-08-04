import { useTranslation } from 'react-i18next';
import { Card, CardContent, MenuItem, TextField } from '@mui/material';
import type { VoucherType } from '../../types/journal';
import { VOUCHER_TYPES } from '../../types/journal';

interface JournalFiltersProps {
  from: string;
  to: string;
  voucherType: VoucherType | '';
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onVoucherTypeChange: (value: VoucherType | '') => void;
}

export function JournalFilters({ from, to, voucherType, onFromChange, onToChange, onVoucherTypeChange }: JournalFiltersProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          type="date"
          size="small"
          label={t('journal.filters.from')}
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          size="small"
          label={t('journal.filters.to')}
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          select
          size="small"
          label={t('journal.filters.voucherType')}
          value={voucherType}
          onChange={(e) => onVoucherTypeChange(e.target.value as VoucherType | '')}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('journal.filters.all')}</MenuItem>
          {VOUCHER_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {t(`voucherType.${type}`)}
            </MenuItem>
          ))}
        </TextField>
      </CardContent>
    </Card>
  );
}
