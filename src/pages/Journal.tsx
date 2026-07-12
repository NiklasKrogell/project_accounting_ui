import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { journalEntriesApi } from '../api/journalEntries';
import { accountsApi } from '../api/accounts';
import { useJournalEntryDialog } from '../components/JournalEntry/JournalEntryDialogContext';
import type { JournalEntry, VoucherType } from '../types/journal';
import { VOUCHER_TYPES } from '../types/journal';
import type { Account } from '../types/account';
import { roleAtLeast } from '../lib/roles';
import { formatCurrency, formatDate } from '../lib/format';

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
  }, [activeMembership?.companyId]);

  const accountLabel = useCallback(
    (id: string) => {
      const account = accountsById.get(id);
      return account ? `${account.number} ${account.name}` : '';
    },
    [accountsById],
  );

  // Filter changes reset pagination so results always start from page one.
  const applyFilter = (setter: () => void) => {
    setter();
    setPage(0);
  };

  const rows = useMemo(() => {
    if (!entries) return null;
    return entries.map((entry) => (
      <EntryRows key={entry.id} entry={entry} lang={lang} accountLabel={accountLabel} />
    ));
  }, [entries, lang, accountLabel]);

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

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            type="date"
            size="small"
            label={t('journal.filters.from')}
            value={from}
            onChange={(e) => applyFilter(() => setFrom(e.target.value))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label={t('journal.filters.to')}
            value={to}
            onChange={(e) => applyFilter(() => setTo(e.target.value))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            size="small"
            label={t('journal.filters.voucherType')}
            value={voucherType}
            onChange={(e) => applyFilter(() => setVoucherType(e.target.value as VoucherType | ''))}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">{t('journal.filters.all')}</MenuItem>
            {VOUCHER_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {t(`voucherType.${type}`)}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Card>
        {entries === null ? (
          <CardContent>
            <Typography>{t('common.loading')}</Typography>
          </CardContent>
        ) : entries.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary">{t('journal.empty')}</Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('journal.columns.account')}</TableCell>
                  <TableCell>{t('journal.columns.description')}</TableCell>
                  <TableCell align="right">{t('journal.columns.debit')}</TableCell>
                  <TableCell align="right">{t('journal.columns.credit')}</TableCell>
                  <TableCell align="right">{t('journal.columns.vat')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{rows}</TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Card>
    </Box>
  );
}

interface EntryRowsProps {
  entry: JournalEntry;
  lang: string;
  accountLabel: (id: string) => string;
}

// One header row per entry (date, voucher chip, description) followed by its
// indented lines. No expand/collapse — prototype-simple.
function EntryRows({ entry, lang, accountLabel }: EntryRowsProps) {
  const { t } = useTranslation();
  return (
    <>
      <TableRow sx={{ backgroundColor: 'action.hover' }}>
        <TableCell colSpan={5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatDate(entry.date, lang)}
            </Typography>
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${t(`voucherType.${entry.voucherType}`)} #${entry.voucherNumber}`}
            />
            <Typography variant="body2">{entry.description}</Typography>
          </Box>
        </TableCell>
      </TableRow>
      {entry.lines.map((line) => (
        <TableRow key={line.id}>
          <TableCell sx={{ pl: 4 }}>{accountLabel(line.accountId)}</TableCell>
          <TableCell>{line.description}</TableCell>
          <TableCell align="right">
            {line.type === 'debit' ? formatCurrency(line.amount, lang) : ''}
          </TableCell>
          <TableCell align="right">
            {line.type === 'credit' ? formatCurrency(line.amount, lang) : ''}
          </TableCell>
          <TableCell align="right">{line.vatRate !== 0 ? `${line.vatRate} %` : ''}</TableCell>
        </TableRow>
      ))}
    </>
  );
}
