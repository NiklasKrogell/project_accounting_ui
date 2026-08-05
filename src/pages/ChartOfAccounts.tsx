import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { accountGroupsApi } from '../api/accountGroups';
import { accountsApi } from '../api/accounts';
import type { Account, AccountGroup } from '../types/account';
import { buildChartSections } from '../components/ChartOfAccounts/chartSections';
import { MainClassCard } from '../components/ChartOfAccounts/MainClassCard';
import { UngroupedAccountsCard } from '../components/ChartOfAccounts/UngroupedAccountsCard';

// Chart of accounts (tilikartta): read-only listing of the company's accounts,
// grouped by account group within their main class. Everyone with access can
// view it. Groups come from /account-groups (which carries their accounts, and
// so also shows groups that are still empty); /accounts is fetched alongside
// only to surface accounts that belong to no group at all.
export default function ChartOfAccounts() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();

  const [groups, setGroups] = useState<AccountGroup[] | null>(null);
  const [ungrouped, setUngrouped] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([accountGroupsApi.list(), accountsApi.list()])
      .then(([groupList, accounts]) => {
        setGroups(groupList);
        setUngrouped(accounts.filter((account) => account.accountGroupId === null));
      })
      .catch((err) => setError((err as Error).message));
  }, [activeMembership?.companyId]);

  const sections = useMemo(() => (groups ? buildChartSections(groups) : null), [groups]);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('chartOfAccounts.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {sections === null ? (
        <Typography>{t('common.loading')}</Typography>
      ) : sections.length === 0 && ungrouped.length === 0 ? (
        <Typography color="text.secondary">{t('chartOfAccounts.empty')}</Typography>
      ) : (
        <>
          {sections.map((section) => (
            <MainClassCard key={section.mainClass} section={section} />
          ))}
          {ungrouped.length > 0 && <UngroupedAccountsCard accounts={ungrouped} />}
        </>
      )}
    </Box>
  );
}
