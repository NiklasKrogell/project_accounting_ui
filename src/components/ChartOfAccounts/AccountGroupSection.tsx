import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import type { ChartGroup } from './chartSections';
import { AccountsTable } from './AccountsTable';

// One account group inside a main class card: its name plus its accounts.
export function AccountGroupSection({ group }: { group: ChartGroup }) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" component="h3" color="text.secondary">
        {group.name}
      </Typography>
      {group.accounts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('chartOfAccounts.emptyGroup')}
        </Typography>
      ) : (
        <AccountsTable accounts={group.accounts} />
      )}
    </Box>
  );
}
