import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useAuth } from '../../../auth/AuthContext';
import { accountsApi } from '../../../api/accounts';
import { chartOfAccountsApi } from '../../../api/chartOfAccounts';
import type { Account, VatAccounts } from '../../../types/account';
import { roleAtLeast } from '../../../lib/roles';
import { SettingsSection } from '../SettingsSection';

const accountLabel = (a: Account) => `${a.number} ${a.name}`;

// Company setting: the two accounts a journal entry line's VAT is posted to.
// Either may be left empty; an entry line with VAT on that side then can't be
// saved. It belongs to the active company, so it is reloaded whenever that
// changes. Everyone with access can view it; changing it requires LEDGER+
// (mirrors the backend).
export function VatAccountsSettings() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const companyId = activeMembership?.companyId;
  const canEdit = roleAtLeast(activeMembership?.role, 'LEDGER');

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  // What the backend has; the two fields below are the draft.
  const [stored, setStored] = useState<VatAccounts | null>(null);
  const [receivable, setReceivable] = useState<Account | null>(null);
  const [payable, setPayable] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Guards against a slow response for the previous company landing after
    // the user has switched to another one.
    let stale = false;
    setAccounts(null);
    setStored(null);
    setReceivable(null);
    setPayable(null);
    setLoadError(null);
    Promise.all([accountsApi.list(), chartOfAccountsApi.getVatAccounts()])
      .then(([accountList, vatAccounts]) => {
        if (stale) return;
        const byId = (id: string | null) => accountList.find((a) => a.id === id) ?? null;
        setAccounts(accountList);
        setStored(vatAccounts);
        setReceivable(byId(vatAccounts.vatReceivableAccountId));
        setPayable(byId(vatAccounts.vatPayableAccountId));
      })
      .catch((err) => {
        if (!stale) setLoadError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [companyId]);

  const draft: VatAccounts = {
    vatReceivableAccountId: receivable?.id ?? null,
    vatPayableAccountId: payable?.id ?? null,
  };
  const dirty =
    stored !== null &&
    (draft.vatReceivableAccountId !== stored.vatReceivableAccountId ||
      draft.vatPayableAccountId !== stored.vatPayableAccountId);

  const accountField = (
    label: string,
    value: Account | null,
    onChange: (account: Account | null) => void,
  ) => (
    <Autocomplete
      options={accounts ?? []}
      value={value}
      onChange={(_, account) => onChange(account)}
      getOptionLabel={accountLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      loading={accounts === null}
      loadingText={t('common.loading')}
      disabled={!canEdit || stored === null}
      renderInput={(params) => <TextField {...params} label={label} fullWidth />}
    />
  );

  return (
    <SettingsSection
      // Remounted per company so a "saved" note or error never carries over.
      key={companyId}
      title={t('vatAccounts.title')}
      dirty={dirty}
      onSave={async () => setStored(await chartOfAccountsApi.setVatAccounts(draft))}
      readOnlyNote={canEdit ? undefined : t('vatAccounts.readOnlyNote')}
    >
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('vatAccounts.hint')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, maxWidth: 480 }}>
        {accountField(t('vatAccounts.receivable'), receivable, setReceivable)}
        {accountField(t('vatAccounts.payable'), payable, setPayable)}
      </Box>
    </SettingsSection>
  );
}
