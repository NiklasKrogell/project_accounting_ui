import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { accountGroupsApi } from '../api/accountGroups';
import { accountsApi } from '../api/accounts';
import type { Account, AccountGroup } from '../types/account';
import { roleAtLeast } from '../lib/roles';
import { buildChartSections } from '../components/ChartOfAccounts/chartSections';
import { MainClassCard } from '../components/ChartOfAccounts/MainClassCard';
import { UngroupedAccountsCard } from '../components/ChartOfAccounts/UngroupedAccountsCard';
import { AccountEditDialog } from '../components/ChartOfAccounts/AccountEditDialog';
import {
  AccountGroupDialog,
  type AccountGroupDialogTarget,
} from '../components/ChartOfAccounts/AccountGroupDialog';
import { VatAccountsDialog } from '../components/ChartOfAccounts/VatAccountsDialog';

// Chart of accounts (tilikartta): listing of the company's accounts, grouped by
// account group within their main class. Everyone with access can view it;
// editing accounts and groups, and picking the VAT accounts, requires LEDGER+
// (mirrors the backend), and without that role the rows simply aren't clickable. Groups come from /account-groups
// (which carries their accounts, and so also shows groups that are still
// empty); /accounts is fetched alongside only to surface accounts that belong
// to no group at all.
export default function ChartOfAccounts() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const canEdit = roleAtLeast(activeMembership?.role, 'LEDGER');

  const [groups, setGroups] = useState<AccountGroup[] | null>(null);
  const [ungrouped, setUngrouped] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [groupTarget, setGroupTarget] = useState<AccountGroupDialogTarget | null>(null);
  const [vatAccountsOpen, setVatAccountsOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [groupList, accounts] = await Promise.all([
        accountGroupsApi.list(),
        accountsApi.list(),
      ]);
      setGroups(groupList);
      setUngrouped(accounts.filter((account) => account.accountGroupId === null));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeMembership?.companyId]);

  const sections = useMemo(() => (groups ? buildChartSections(groups) : null), [groups]);
  const onSelectAccount = canEdit ? setEditing : undefined;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('chartOfAccounts.title')}
        </Typography>
        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setVatAccountsOpen(true)}>
              {t('chartOfAccounts.vatAccounts')}
            </Button>
            <Button variant="outlined" onClick={() => setGroupTarget({ mode: 'create' })}>
              {t('chartOfAccounts.newGroup')}
            </Button>
          </Box>
        )}
      </Box>

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
            <MainClassCard
              key={section.mainClass}
              section={section}
              onSelectAccount={onSelectAccount}
              onEditGroup={
                canEdit ? (group) => setGroupTarget({ mode: 'edit', ...group }) : undefined
              }
            />
          ))}
          {ungrouped.length > 0 && (
            <UngroupedAccountsCard accounts={ungrouped} onSelectAccount={onSelectAccount} />
          )}
        </>
      )}

      <AccountEditDialog
        account={editing}
        groups={groups ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => void load()}
      />
      <AccountGroupDialog
        target={groupTarget}
        onClose={() => setGroupTarget(null)}
        onSaved={() => void load()}
      />
      <VatAccountsDialog open={vatAccountsOpen} onClose={() => setVatAccountsOpen(false)} />
    </Box>
  );
}
