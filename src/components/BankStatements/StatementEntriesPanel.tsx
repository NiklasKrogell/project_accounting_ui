import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Chip, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { bankStatementsApi } from '../../api/bankStatements';
import { journalEntriesApi } from '../../api/journalEntries';
import type { BankAccount } from '../../types/bankAccount';
import type {
  BankStatement,
  BankStatementPatch,
  BankStatementSummary,
} from '../../types/bankStatement';
import type { JournalEntry } from '../../types/journal';
import { formatIban } from '../../lib/iban';
import { JournalEntriesTable } from '../Journal/JournalEntriesTable';
import JournalEntryForm, { type JournalEntryFormTarget } from '../JournalEntry/JournalEntryForm';
import { StatementSummary } from './StatementSummary';

interface StatementEntriesPanelProps {
  // The panel is for one statement: the page gives it a key by the
  // statement's id, so another statement starts it afresh.
  statement: BankStatement;
  // The company's bank accounts; null while loading.
  bankAccounts: BankAccount[] | null;
  accountLabel: (id: string) => string;
  costCenterLabel: (id: string | null) => string;
  // Whether the user may change the statement and book from it (LEDGER+).
  canManage: boolean;
  lang: string;
  // The statement as saved, after its bank account or posted mark changed.
  onStatementChange: (statement: BankStatement) => void;
  // An entry was saved or deleted, so the statement's entry count changed.
  onEntriesChange: () => void;
  // Whether an entry is being written, for the page to ask before leaving it.
  onEditingChange: (editing: boolean) => void;
}

// The left-hand side of the bank statement page: the bank account the
// statement is of on top, the journal entries booked from it in the middle —
// or the entry form, when one is being written — and what they add up to at
// the foot.
export function StatementEntriesPanel({
  statement,
  bankAccounts,
  accountLabel,
  costCenterLabel,
  canManage,
  lang,
  onStatementChange,
  onEntriesChange,
  onEditingChange,
}: StatementEntriesPanelProps) {
  const { t } = useTranslation();
  const statementId = statement.id;

  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [summary, setSummary] = useState<BankStatementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Saving a change to the statement itself.
  const [busy, setBusy] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<JournalEntryFormTarget | null>(null);
  // A new key for every opening, so the form never carries over what was
  // typed for another entry.
  const [formKey, setFormKey] = useState(0);
  // Bumped after an entry is saved or deleted, to reload entries and sums.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let stale = false;
    journalEntriesApi
      .list({ bankStatementId: statementId, take: rowsPerPage, skip: page * rowsPerPage })
      .then(({ data, meta }) => {
        if (stale) return;
        // Deleting the only entry of the last page leaves that page empty.
        if (data.length === 0 && meta.total > 0 && page > 0) {
          setPage(Math.ceil(meta.total / rowsPerPage) - 1);
          return;
        }
        setEntries(data);
        setTotal(meta.total);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [statementId, page, rowsPerPage, version]);

  // The sums depend on the bank account too: it says which lines are the
  // bank's.
  useEffect(() => {
    let stale = false;
    bankStatementsApi
      .summary(statementId)
      .then((loaded) => {
        if (!stale) setSummary(loaded);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [statementId, statement.bankAccountId, version]);

  useEffect(() => {
    onEditingChange(formTarget !== null);
  }, [formTarget, onEditingChange]);
  useEffect(() => () => onEditingChange(false), [onEditingChange]);

  const voucherLabel = useCallback(
    (entry: JournalEntry) => `${t(`voucherType.${entry.voucherType}`)} #${entry.voucherNumber}`,
    [t],
  );

  async function patchStatement(patch: BankStatementPatch) {
    setBusy(true);
    setError(null);
    try {
      onStatementChange(await bankStatementsApi.update(statementId, patch));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const openForm = useCallback((target: JournalEntryFormTarget) => {
    setError(null);
    setFormKey((key) => key + 1);
    setFormTarget(target);
  }, []);

  // A new entry starts with the bank account's accounting account on its
  // first line, which is also what the totals below are summed on.
  const openCreate = () =>
    openForm({
      mode: 'create',
      initial: {
        bankStatementId: statementId,
        ...(statement.bankAccount ? { accountId: statement.bankAccount.accountId } : {}),
      },
    });

  function handleSaved() {
    setFormTarget(null);
    setVersion((v) => v + 1);
    onEntriesChange();
  }

  const removeEntry = useCallback(
    async (entry: JournalEntry) => {
      if (
        !window.confirm(t('bankStatements.entries.confirmDelete', { voucher: voucherLabel(entry) }))
      ) {
        return;
      }
      setBusyEntryId(entry.id);
      setError(null);
      try {
        await journalEntriesApi.remove(entry.id);
        setVersion((v) => v + 1);
        onEntriesChange();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusyEntryId(null);
      }
    },
    [t, voucherLabel, onEntriesChange],
  );

  const renderActions = useCallback(
    (entry: JournalEntry) => (
      <>
        <IconButton
          size="small"
          aria-label={t('bankStatements.entries.edit', { voucher: voucherLabel(entry) })}
          disabled={busyEntryId === entry.id}
          onClick={() => openForm({ mode: 'edit', entry })}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={t('bankStatements.entries.delete', { voucher: voucherLabel(entry) })}
          disabled={busyEntryId === entry.id}
          onClick={() => void removeEntry(entry)}
        >
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </>
    ),
    [t, voucherLabel, busyEntryId, openForm, removeEntry],
  );

  // The bank accounts on offer: those in use, and the one the statement
  // already has even if it has since been taken out of use (or the list has
  // not loaded yet).
  const bankAccountOptions: Array<Pick<BankAccount, 'id' | 'name' | 'iban'>> = (
    bankAccounts ?? []
  ).filter((bankAccount) => bankAccount.isActive || bankAccount.id === statement.bankAccountId);
  if (
    statement.bankAccount &&
    !bankAccountOptions.some((option) => option.id === statement.bankAccountId)
  ) {
    bankAccountOptions.unshift(statement.bankAccount);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, minWidth: 0 }}>
          <Typography variant="h6" component="h2" noWrap sx={{ minWidth: 0 }}>
            {statement.file.originalName}
          </Typography>
          <Chip
            size="small"
            color={statement.posted ? 'success' : 'default'}
            variant={statement.posted ? 'filled' : 'outlined'}
            label={t(
              statement.posted ? 'bankStatements.status.posted' : 'bankStatements.status.unposted',
            )}
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <TextField
            select
            size="small"
            label={t('bankStatements.bankAccount.label')}
            value={statement.bankAccountId ?? ''}
            onChange={(e) => void patchStatement({ bankAccountId: e.target.value || null })}
            disabled={!canManage || busy}
            sx={{ minWidth: 300 }}
            // The empty choice has a text of its own, so the label stays up.
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">
              <em>{t('bankStatements.bankAccount.none')}</em>
            </MenuItem>
            {bankAccountOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name} · {formatIban(option.iban)}
              </MenuItem>
            ))}
          </TextField>
          {canManage && (
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => void patchStatement({ posted: !statement.posted })}
              sx={{ ml: 'auto' }}
            >
              {t(statement.posted ? 'bankStatements.markUnposted' : 'bankStatements.markPosted')}
            </Button>
          )}
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {formTarget ? (
        <JournalEntryForm
          key={formKey}
          target={formTarget}
          onCancel={() => setFormTarget(null)}
          onSaved={handleSaved}
        >
          {({ title, body, actions }) => (
            <>
              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
                <Typography variant="h6" component="h3">
                  {title}
                </Typography>
                {body}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderTop: 1,
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                {actions}
              </Box>
            </>
          )}
        </JournalEntryForm>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Typography variant="h6" component="h3">
              {t('bankStatements.entries.title')}
            </Typography>
            {canManage && (
              <Button variant="contained" onClick={openCreate}>
                {t('bankStatements.entries.newButton')}
              </Button>
            )}
          </Box>
          <JournalEntriesTable
            entries={entries}
            lang={lang}
            accountLabel={accountLabel}
            costCenterLabel={costCenterLabel}
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(0);
            }}
            renderActions={canManage ? renderActions : undefined}
            emptyText={t('bankStatements.entries.empty')}
          />
        </Box>
      )}

      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          flexShrink: 0,
          maxHeight: '40%',
          overflowY: 'auto',
        }}
      >
        <StatementSummary summary={summary} lang={lang} />
      </Box>
    </Box>
  );
}
