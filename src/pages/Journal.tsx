import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { journalEntriesApi } from '../api/journalEntries';
import { accountsApi } from '../api/accounts';
import { costCentersApi } from '../api/costCenters';
import { useJournalEntryDialog } from '../components/JournalEntry/JournalEntryDialogContext';
import { JournalFilters } from '../components/Journal/JournalFilters';
import { JournalEntriesTable } from '../components/Journal/JournalEntriesTable';
import type { JournalEntry, VoucherType } from '../types/journal';
import type { Account } from '../types/account';
import { costCenterLabel, type CostCenter } from '../types/costCenter';
import { roleAtLeast } from '../lib/roles';

// Journal (päiväkirja): chronological list of entries with their lines.
// Everyone with access can view; creating entries requires LEDGER+.
export default function Journal() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { activeMembership } = useAuth();
  const { openCreate } = useJournalEntryDialog();
  const canCreate = roleAtLeast(activeMembership?.role, 'LEDGER');
  const lang = i18n.language;

  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [accountsById, setAccountsById] = useState<Map<string, Account>>(new Map());
  const [costCentersById, setCostCentersById] = useState<Map<string, CostCenter>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [voucherType, setVoucherType] = useState<VoucherType | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, meta } = await journalEntriesApi.list({
        from: from || undefined,
        to: to || undefined,
        voucherType: voucherType || undefined,
        take: rowsPerPage,
        skip: page * rowsPerPage,
      });
      setEntries(data);
      setTotal(meta.total);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [from, to, voucherType, page, rowsPerPage]);

  // location.key changes on every navigation, so saving via "Uusi → Kirjaus"
  // (which navigates here) refreshes the list even when already on this page.
  useEffect(() => {
    void load();
  }, [load, activeMembership?.companyId, location.key]);

  useEffect(() => {
    accountsApi
      .list()
      .then((accounts) => setAccountsById(new Map(accounts.map((a) => [a.id, a]))))
      .catch((err) => setError((err as Error).message));
    costCentersApi
      .list()
      .then((costCenters) => setCostCentersById(new Map(costCenters.map((c) => [c.id, c]))))
      .catch((err) => setError((err as Error).message));
  }, [activeMembership?.companyId]);

  const accountLabel = useCallback(
    (id: string) => {
      const account = accountsById.get(id);
      return account ? `${account.number} ${account.name}` : '';
    },
    [accountsById],
  );

  const costCenterLabelById = useCallback(
    (id: string | null) => {
      const costCenter = id ? costCentersById.get(id) : undefined;
      return costCenter ? costCenterLabel(costCenter) : '';
    },
    [costCentersById],
  );

  // Filter changes reset pagination so results always start from page one.
  const applyFilter = (setter: () => void) => {
    setter();
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('journal.title')}
        </Typography>
        {canCreate && (
          <Button variant="contained" onClick={() => openCreate({ onSaved: () => void load() })}>
            {t('journal.newButton')}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <JournalFilters
        from={from}
        to={to}
        voucherType={voucherType}
        onFromChange={(value) => applyFilter(() => setFrom(value))}
        onToChange={(value) => applyFilter(() => setTo(value))}
        onVoucherTypeChange={(value) => applyFilter(() => setVoucherType(value))}
      />

      <JournalEntriesTable
        entries={entries}
        lang={lang}
        accountLabel={accountLabel}
        costCenterLabel={costCenterLabelById}
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
