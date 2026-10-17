import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { bankStatementsApi } from '../../api/bankStatements';
import { journalEntriesApi } from '../../api/journalEntries';
import type { BankAccount } from '../../types/bankAccount';
import type {
  BankStatement,
  BankStatementLine,
  BankStatementPatch,
  BankStatementSummary,
  CsvImportResult,
} from '../../types/bankStatement';
import type { JournalEntry } from '../../types/journal';
import { formatCurrency, formatDate } from '../../lib/format';
import { formatIban } from '../../lib/iban';
import { JournalEntriesTable } from '../Journal/JournalEntriesTable';
import JournalEntryForm, { type JournalEntryFormTarget } from '../JournalEntry/JournalEntryForm';
import { CsvImportDialog } from './CsvImportDialog';
import { StatementLinesTable } from './StatementLinesTable';
import { StatementSummary } from './StatementSummary';

// The middle of the panel: the statement's transactions (imported from the
// bank's CSV) or the journal entries booked from it.
type PanelTab = 'lines' | 'entries';

// A booked transaction's description: who, and what for.
function lineDescription(line: BankStatementLine): string {
  return [line.counterparty, line.message || line.reference || line.transactionType]
    .filter(Boolean)
    .join(' – ')
    .slice(0, 500);
}

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
// statement is of on top; in the middle, in tabs, the transactions imported
// from the bank's CSV and the journal entries booked from the statement — or
// the entry form, when one is being written; and what the entries add up to at
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
  const [lines, setLines] = useState<BankStatementLine[] | null>(null);
  // Null until the transactions have loaded: a statement that has some opens
  // on them, one that has none on its entries.
  const [tab, setTab] = useState<PanelTab | null>(null);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  // What the last import did.
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    bankStatementsApi
      .lines(statementId)
      .then((loaded) => {
        if (stale) return;
        setLines(loaded);
        setTab((current) => current ?? (loaded.length > 0 ? 'lines' : 'entries'));
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [statementId, version]);

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
        ...(statement.bankAccount ? { lines: [{ accountId: statement.bankAccount.accountId }] } : {}),
      },
    });

  function handleSaved() {
    setFormTarget(null);
    setVersion((v) => v + 1);
    onEntriesChange();
  }

  // A transaction booked as it is on the statement: on its date, from the
  // bank account's accounting account to an account left to choose, the
  // amounts gross since the bank's amount includes any VAT.
  const bookLine = (line: BankStatementLine) =>
    openForm({
      mode: 'create',
      initial: {
        bankStatementId: statementId,
        bankStatementLineId: line.id,
        date: line.bookingDate,
        description: lineDescription(line),
        vatBasis: 'gross',
        lines: [
          { accountId: statement.bankAccount?.accountId, amount: line.amount },
          { amount: -line.amount },
        ],
      },
    });

  async function openLineEntry(line: BankStatementLine) {
    if (!line.journalEntry) return;
    setError(null);
    try {
      openForm({ mode: 'edit', entry: await journalEntriesApi.get(line.journalEntry.id) });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeLine(line: BankStatementLine) {
    if (
      !window.confirm(
        t('bankStatements.lines.confirmDelete', {
          date: formatDate(line.bookingDate, lang),
          counterparty: line.counterparty,
          amount: formatCurrency(line.amount, lang),
        }),
      )
    ) {
      return;
    }
    setBusyLineId(line.id);
    setError(null);
    try {
      await bankStatementsApi.removeLine(statementId, line.id);
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyLineId(null);
    }
  }

  function handleImported(result: CsvImportResult) {
    setCsvOpen(false);
    setNotice(t('bankStatements.lines.imported', { ...result }));
    setTab('lines');
    setVersion((v) => v + 1);
  }

  const bookedCount = lines?.filter((line) => line.journalEntry).length ?? 0;

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
      <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        {/* No title row: the file's name is over the PDF, and the list shows
            which statement is open and whether it is posted. */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <TextField
            select
            size="small"
            label={t('bankStatements.bankAccount.label')}
            value={statement.bankAccountId ?? ''}
            onChange={(e) => void patchStatement({ bankAccountId: e.target.value || null })}
            disabled={!canManage || busy}
            // Compact: the space goes to the entries below.
            sx={{
              minWidth: 260,
              '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' },
            }}
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
              size="small"
              disabled={busy}
              onClick={() => void patchStatement({ posted: !statement.posted })}
              sx={{ ml: 'auto' }}
            >
              {t(statement.posted ? 'bankStatements.markUnposted' : 'bankStatements.markPosted')}
            </Button>
          )}
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
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
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2, pt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Tabs
              value={tab ?? false}
              onChange={(_, value: PanelTab) => setTab(value)}
              aria-label={t('bankStatements.lines.tabsLabel')}
              // Compact, like the rest of the panel's controls.
              sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 1.5, fontSize: '0.8125rem' } }}
            >
              <Tab
                value="lines"
                id="statement-tab-lines"
                aria-controls="statement-tabpanel-lines"
                label={
                  lines && lines.length > 0
                    ? t('bankStatements.lines.tabWithCount', { booked: bookedCount, count: lines.length })
                    : t('bankStatements.lines.tab')
                }
              />
              <Tab
                value="entries"
                id="statement-tab-entries"
                aria-controls="statement-tabpanel-entries"
                label={t('bankStatements.entries.title')}
              />
            </Tabs>
            {canManage && (
              <Box sx={{ display: 'flex', gap: 1, pb: 0.5 }}>
                <Tooltip title={statement.bankAccount ? '' : t('bankStatements.csv.needsBankAccount')}>
                  {/* A disabled button gets no hover, so the hint sits on a wrapper. */}
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={!statement.bankAccount}
                      onClick={() => {
                        setNotice(null);
                        setCsvOpen(true);
                      }}
                    >
                      {t('bankStatements.csv.button')}
                    </Button>
                  </span>
                </Tooltip>
                <Button variant="contained" size="small" onClick={openCreate}>
                  {t('bankStatements.entries.newButton')}
                </Button>
              </Box>
            )}
          </Box>
          {notice && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}
          {tab === null && <Typography>{t('common.loading')}</Typography>}
          {tab === 'lines' && (
            <Box role="tabpanel" id="statement-tabpanel-lines" aria-labelledby="statement-tab-lines">
              <StatementLinesTable
                lines={lines}
                lang={lang}
                canManage={canManage}
                busyLineId={busyLineId}
                onBook={bookLine}
                onOpenEntry={(line) => void openLineEntry(line)}
                onDelete={(line) => void removeLine(line)}
              />
            </Box>
          )}
          {tab === 'entries' && (
            <Box role="tabpanel" id="statement-tabpanel-entries" aria-labelledby="statement-tab-entries">
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
        </Box>
      )}

      {canManage && (
        <CsvImportDialog
          open={csvOpen}
          statement={statement}
          lang={lang}
          onClose={() => setCsvOpen(false)}
          onImported={handleImported}
        />
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
