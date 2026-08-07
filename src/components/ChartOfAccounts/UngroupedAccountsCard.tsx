import { useTranslation } from 'react-i18next';
import { Card, CardContent, Typography } from '@mui/material';
import type { Account } from '../../types/account';
import { AccountsTable } from './AccountsTable';

interface UngroupedAccountsCardProps {
  accounts: Account[];
  onSelectAccount?: (account: Account) => void;
}

// Accounts that belong to no group. They have no main class either, so they
// can't sit in any MainClassCard — without this they'd silently vanish from
// the chart.
export function UngroupedAccountsCard({ accounts, onSelectAccount }: UngroupedAccountsCardProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2">
          {t('chartOfAccounts.ungrouped')}
        </Typography>
        <AccountsTable accounts={accounts} onSelect={onSelectAccount} />
      </CardContent>
    </Card>
  );
}
