import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Divider,
  FormControlLabel,
  FormHelperText,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../../auth/AuthContext';
import { accountsApi } from '../../../api/accounts';
import { chartOfAccountsApi } from '../../../api/chartOfAccounts';
import { companySettingsApi } from '../../../api/companySettings';
import type { Account, VatAccounts } from '../../../types/account';
import type { CompanySettings } from '../../../types/settings';
import { roleAtLeast } from '../../../lib/roles';
import { SettingsSection } from '../SettingsSection';

const accountLabel = (a: Account) => `${a.number} ${a.name}`;

// Company settings for VAT: whether the company is VAT-registered at all, and
// the two accounts a journal entry line's VAT is posted to. A company that is
// not registered books no VAT, so the accounts are greyed out for it (and kept
// as they are, for when it registers). Either account may be left empty; an
// entry line with VAT on that side then can't be saved. The settings belong to
// the active company, so they are reloaded whenever that changes. Everyone
// with access can view them; changing the accounts requires LEDGER+ and
// changing the registration ACCOUNTANT+ (mirrors the backend).
export function VatAccountsSettings() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const companyId = activeMembership?.companyId;
  const canEdit = roleAtLeast(activeMembership?.role, 'LEDGER');
  const canEditRegistration = roleAtLeast(activeMembership?.role, 'ACCOUNTANT');

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  // What the backend has; the three fields below are the draft.
  const [stored, setStored] = useState<VatAccounts | null>(null);
  const [storedSettings, setStoredSettings] = useState<CompanySettings | null>(null);
  const [registered, setRegistered] = useState(true);
  const [receivable, setReceivable] = useState<Account | null>(null);
  const [payable, setPayable] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Guards against a slow response for the previous company landing after
    // the user has switched to another one.
    let stale = false;
    setAccounts(null);
    setStored(null);
    setStoredSettings(null);
    setRegistered(true);
    setReceivable(null);
    setPayable(null);
    setLoadError(null);
    Promise.all([
      accountsApi.list(),
      chartOfAccountsApi.getVatAccounts(),
      companySettingsApi.get(),
    ])
      .then(([accountList, vatAccounts, settings]) => {
        if (stale) return;
        const byId = (id: string | null) => accountList.find((a) => a.id === id) ?? null;
        setAccounts(accountList);
        setStored(vatAccounts);
        setStoredSettings(settings);
        setRegistered(settings.vatRegistered);
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
  const registrationDirty = storedSettings !== null && registered !== storedSettings.vatRegistered;
  const accountsDirty =
    stored !== null &&
    (draft.vatReceivableAccountId !== stored.vatReceivableAccountId ||
      draft.vatPayableAccountId !== stored.vatPayableAccountId);

  // The registration and the accounts live behind different endpoints; each is
  // saved only when it changed, so a LEDGER user's save never touches the
  // registration.
  async function save() {
    if (registrationDirty) {
      setStoredSettings(await companySettingsApi.update({ vatRegistered: registered }));
    }
    if (accountsDirty) setStored(await chartOfAccountsApi.setVatAccounts(draft));
  }

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
      disabled={!canEdit || stored === null || !registered}
      renderInput={(params) => <TextField {...params} label={label} fullWidth />}
    />
  );

  return (
    <SettingsSection
      // Remounted per company so a "saved" note or error never carries over.
      key={companyId}
      title={t('vatAccounts.title')}
      dirty={registrationDirty || accountsDirty}
      onSave={save}
      readOnlyNote={canEdit ? undefined : t('vatAccounts.readOnlyNote')}
    >
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <FormControlLabel
        control={
          <Switch
            checked={registered}
            onChange={(e) => setRegistered(e.target.checked)}
            disabled={!canEditRegistration || storedSettings === null}
          />
        }
        label={t('vatAccounts.registered')}
      />
      {/* A viewer is already told above that the whole section is read-only. */}
      {canEdit && !canEditRegistration && (
        <FormHelperText>{t('vatAccounts.registeredRoleNote')}</FormHelperText>
      )}
      {!registered && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('vatAccounts.notRegisteredNote')}
        </Typography>
      )}
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color={registered ? 'text.secondary' : 'text.disabled'}>
        {t('vatAccounts.hint')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, maxWidth: 480 }}>
        {accountField(t('vatAccounts.receivable'), receivable, setReceivable)}
        {accountField(t('vatAccounts.payable'), payable, setPayable)}
      </Box>
    </SettingsSection>
  );
}
