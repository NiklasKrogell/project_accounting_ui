import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { generalLedgerApi } from '../api/generalLedger';
import { accountsApi } from '../api/accounts';
import type { Account } from '../types/account';
import type { GeneralLedgerAccount } from '../types/generalLedger';
import { GeneralLedgerFilters } from '../components/GeneralLedger/GeneralLedgerFilters';
import { LedgerTable } from '../components/GeneralLedger/LedgerTable';

// General ledger (pääkirja): the journal regrouped by account, each account
// showing its opening balance, postings with a running balance, and a closing
// balance. Read-only, so everyone with access to the company can view it.
//
// Pagination is per ACCOUNT (the backend never splits an account's postings
// across pages), which is why the rows-per-page control is labelled in
// accounts rather than rows.
export default function GeneralLedger() {
  const { t, i18n } = useTranslation();
  const { activeMembership } = useAuth();
  const lang = i18n.language;

  const [accounts, setAccounts] = useState<GeneralLedgerAccount[] | null>(null);
  const [total, setTotal] = useState(0);
  const [accountOptions, setAccountOptions] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, meta } = await generalLedgerApi.list({
        from: from || undefined,
        to: to || undefined,
        accountId: accountId || undefined,
        take: rowsPerPage,
        skip: page * rowsPerPage,
      });
      setAccounts(data);
      setTotal(meta.total);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [from, to, accountId, page, rowsPerPage]);

  useEffect(() => {
    void load();
  }, [load, activeMembership?.companyId]);

  // The account filter's options. companyId is in the deps so switching
  // company doesn't leave the previous company's accounts in the select.
  useEffect(() => {
    accountsApi
      .list()
      .then(setAccountOptions)
      .catch((err) => setError((err as Error).message));
  }, [activeMembership?.companyId]);

  // Filter changes reset pagination so results always start from page one.
  const applyFilter = (setter: () => void) => {
    setter();
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('generalLedger.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <GeneralLedgerFilters
        from={from}
        to={to}
        accountId={accountId}
        accounts={accountOptions}
        onFromChange={(value) => applyFilter(() => setFrom(value))}
        onToChange={(value) => applyFilter(() => setTo(value))}
        onAccountChange={(value) => applyFilter(() => setAccountId(value))}
      />

      <LedgerTable
        accounts={accounts}
        lang={lang}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(0);
        }}
      />
    </Box>
  );
}
