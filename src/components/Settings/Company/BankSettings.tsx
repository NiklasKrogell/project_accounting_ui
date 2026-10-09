import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useAuth } from '../../../auth/AuthContext';
import { accountsApi } from '../../../api/accounts';
import { bankAccountsApi } from '../../../api/bankAccounts';
import type { Account } from '../../../types/account';
import type { BankAccount } from '../../../types/bankAccount';
import { formatIban } from '../../../lib/iban';
import { roleAtLeast } from '../../../lib/roles';
import { BankAccountDialog, type BankAccountDialogTarget } from './BankAccountDialog';

// Company settings for banking. For now the company's bank accounts: each has
// a name, an IBAN and the accounting account its transactions are booked on.
// A bank account is never deleted; one that is no longer needed is taken out
// of use and can be taken back into use. Unlike the other settings sections
// this is a list managed row by row, so it is not built on SettingsSection:
// every add, edit and removal is saved at once and the list reloaded from the
// server. The settings belong to the active company, so they are reloaded
// whenever that changes. Everyone with access can view them; managing them
// requires LEDGER+ (mirrors the backend).
export function BankSettings() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const companyId = activeMembership?.companyId;
  const canManage = roleAtLeast(activeMembership?.role, 'LEDGER');

  const [bankAccounts, setBankAccounts] = useState<BankAccount[] | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [target, setTarget] = useState<BankAccountDialogTarget | null>(null);
  // Bumped after each mutation to reload the list.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setBankAccounts(null);
    setAccounts(null);
    setError(null);
    setTarget(null);
  }, [companyId]);

  useEffect(() => {
    // Guards against a slow response for the previous company landing after
    // the user has switched to another one.
    let stale = false;
    bankAccountsApi
      .list()
      .then((list) => {
        if (!stale) setBankAccounts(list);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [companyId, version]);

  // The accounting accounts are only needed for the dialog's picker.
  useEffect(() => {
    if (!canManage) return;
    let stale = false;
    accountsApi
      .list()
      .then((list) => {
        if (!stale) setAccounts(list);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [companyId, canManage]);

  async function setActive(bankAccount: BankAccount, isActive: boolean) {
    if (
      !isActive &&
      !window.confirm(t('bankSettings.accounts.confirmDeactivate', { name: bankAccount.name }))
    ) {
      return;
    }
    setBusyId(bankAccount.id);
    setError(null);
    try {
      await bankAccountsApi.update(bankAccount.id, {
        name: bankAccount.name,
        iban: bankAccount.iban,
        accountId: bankAccount.accountId,
        isActive,
      });
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('bankSettings.title')}
      </Typography>

      {!canManage && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('bankSettings.accounts.readOnlyNote')}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Typography variant="h6" component="h2">
            {t('bankSettings.accounts.title')}
          </Typography>
          {canManage && (
            <Button variant="contained" onClick={() => setTarget({ mode: 'create' })}>
              {t('bankSettings.accounts.newButton')}
            </Button>
          )}
        </CardContent>
        {bankAccounts === null ? (
          <CardContent>
            <Typography>{t('common.loading')}</Typography>
          </CardContent>
        ) : bankAccounts.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary">{t('bankSettings.accounts.empty')}</Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('bankSettings.accounts.columns.name')}</TableCell>
                  <TableCell>{t('bankSettings.accounts.columns.iban')}</TableCell>
                  <TableCell>{t('bankSettings.accounts.columns.account')}</TableCell>
                  {canManage && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {bankAccounts.map((bankAccount) => {
                  const color = bankAccount.isActive ? undefined : 'text.disabled';
                  return (
                    <TableRow key={bankAccount.id}>
                      <TableCell sx={{ color }}>
                        {bankAccount.name}
                        {!bankAccount.isActive && (
                          <Chip
                            size="small"
                            label={t('bankSettings.accounts.inactive')}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell
                        sx={{ color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatIban(bankAccount.iban)}
                      </TableCell>
                      <TableCell sx={{ color }}>
                        {bankAccount.account &&
                          `${bankAccount.account.number} ${bankAccount.account.name}`}
                      </TableCell>
                      {canManage && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            aria-label={t('bankSettings.accounts.edit', { name: bankAccount.name })}
                            disabled={busyId === bankAccount.id}
                            onClick={() => setTarget({ mode: 'edit', bankAccount })}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <Button
                            size="small"
                            aria-label={t(
                              bankAccount.isActive
                                ? 'bankSettings.accounts.deactivateLabel'
                                : 'bankSettings.accounts.activateLabel',
                              { name: bankAccount.name },
                            )}
                            disabled={busyId === bankAccount.id}
                            onClick={() => void setActive(bankAccount, !bankAccount.isActive)}
                          >
                            {t(
                              bankAccount.isActive
                                ? 'bankSettings.accounts.deactivate'
                                : 'bankSettings.accounts.activate',
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <BankAccountDialog
        target={target}
        accounts={accounts}
        onClose={() => setTarget(null)}
        onSaved={() => setVersion((v) => v + 1)}
      />
    </Box>
  );
}
