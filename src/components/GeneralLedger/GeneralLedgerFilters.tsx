import { useTranslation } from 'react-i18next';
import { Card, CardContent, MenuItem, TextField } from '@mui/material';
import type { Account } from '../../types/account';

interface GeneralLedgerFiltersProps {
  from: string;
  to: string;
  accountId: string;
  accounts: Account[];
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onAccountChange: (value: string) => void;
}

export function GeneralLedgerFilters({
  from,
  to,
  accountId,
  accounts,
  onFromChange,
  onToChange,
  onAccountChange,
}: GeneralLedgerFiltersProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          type="date"
          size="small"
          label={t('generalLedger.filters.from')}
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          size="small"
          label={t('generalLedger.filters.to')}
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          select
          size="small"
          label={t('generalLedger.filters.account')}
          value={accountId}
          onChange={(e) => onAccountChange(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">{t('generalLedger.filters.allAccounts')}</MenuItem>
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              {account.number} {account.name}
            </MenuItem>
          ))}
        </TextField>
      </CardContent>
    </Card>
  );
}
