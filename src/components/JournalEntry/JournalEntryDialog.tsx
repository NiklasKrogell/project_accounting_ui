import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import { accountsApi } from '../../api/accounts';
import { journalEntriesApi } from '../../api/journalEntries';
import type { Account } from '../../types/account';
import type {
  CreateJournalEntryInput,
  EntryLineType,
  JournalEntry,
  VoucherType,
} from '../../types/journal';
import { VOUCHER_TYPES } from '../../types/journal';
import { formatCurrency } from '../../lib/format';

const MAX_LINES = 100;

// Inputs are kept as strings while editing; parsed on submit. The Account
// object (not just its id) is stored so the Autocomplete stays controlled.
interface LineDraft {
  account: Account | null;
  type: EntryLineType;
  amount: string;
  vatRate: string;
  vatAmount: string;
  description: string;
}

function emptyLine(type: EntryLineType): LineDraft {
  return { account: null, type, amount: '', vatRate: '0', vatAmount: '0', description: '' };
}

// Local (not UTC) date so an evening entry defaults to the user's calendar day.
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Accepts Finnish comma decimals ('123,45'). Returns null when not a number.
function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

const accountLabel = (a: Account) => `${a.number} ${a.name}`;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (entry: JournalEntry) => void;
}

// Create-mode journal entry dialog. Reusable anywhere via
// JournalEntryDialogContext; designed so an edit mode can be added later
// (voucherType must then be disabled — the backend forbids changing it).
export default function JournalEntryDialog({ open, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [voucherType, setVoucherType] = useState<VoucherType>('SALES');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [primaryAccount, setPrimaryAccount] = useState<Account | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([emptyLine('debit'), emptyLine('credit')]);

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset the form and (re)fetch accounts every time the dialog opens — this
  // is trivially correct across company switches.
  useEffect(() => {
    if (!open) return;
    setVoucherType('SALES');
    setDate(todayIso());
    setDescription('');
    setPrimaryAccount(null);
    setLines([emptyLine('debit'), emptyLine('credit')]);
    setSubmitError(null);
    setAccounts(null);
    setAccountsError(null);
    accountsApi
      .list()
      .then(setAccounts)
      .catch((err) => setAccountsError((err as Error).message));
  }, [open]);

  const balance = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      const amount = parseAmount(line.amount);
      if (amount === null || amount <= 0) continue;
      if (line.type === 'debit') debit += toCents(amount);
      else credit += toCents(amount);
    }
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  const balanced = balance.difference === 0 && balance.debit > 0 && balance.credit > 0;

  const linesValid = lines.every((line) => {
    const amount = parseAmount(line.amount);
    const vatRate = parseAmount(line.vatRate);
    const vatAmount = parseAmount(line.vatAmount);
    return (
      line.account !== null &&
      amount !== null &&
      amount > 0 &&
      vatRate !== null &&
      vatRate >= 0 &&
      vatRate <= 100 &&
      vatAmount !== null &&
      vatAmount >= 0
    );
  });

  const canSubmit =
    !busy && balanced && linesValid && description.trim().length > 0 && primaryAccount !== null && !!date;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function handleSubmit() {
    if (!canSubmit || !primaryAccount) return;
    setBusy(true);
    setSubmitError(null);
    const input: CreateJournalEntryInput = {
      voucherType,
      date,
      description: description.trim(),
      accountId: primaryAccount.id,
      lines: lines.map((line) => ({
        accountId: line.account!.id,
        amount: parseAmount(line.amount)!,
        description: line.description.trim() || undefined,
        vatRate: parseAmount(line.vatRate)!,
        vatAmount: parseAmount(line.vatAmount)!,
        type: line.type,
      })),
    };
    try {
      const entry = await journalEntriesApi.create(input);
      onSaved?.(entry);
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('journalEntry.dialogTitle')}</DialogTitle>
      <DialogContent>
        {accountsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {accountsError}
          </Alert>
        )}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
          <TextField
            select
            label={t('journalEntry.voucherType')}
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value as VoucherType)}
            sx={{ minWidth: 180 }}
          >
            {VOUCHER_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {t(`voucherType.${type}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            label={t('journalEntry.date')}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Autocomplete
            options={accounts ?? []}
            value={primaryAccount}
            onChange={(_, value) => setPrimaryAccount(value)}
            getOptionLabel={accountLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            loading={accounts === null}
            loadingText={t('journalEntry.loadingAccounts')}
            sx={{ minWidth: 260, flexGrow: 1 }}
            renderInput={(params) => (
              <TextField {...params} label={t('journalEntry.primaryAccount')} required />
            )}
          />
        </Box>
        <TextField
          label={t('journalEntry.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
          sx={{ mt: 2 }}
        />

        <Typography variant="subtitle1" component="h3" sx={{ mt: 3, mb: 1 }}>
          {t('journalEntry.linesTitle')}
        </Typography>
        {lines.map((line, index) => (
          <Box
            key={index}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, alignItems: 'center' }}
          >
            <Autocomplete
              options={accounts ?? []}
              value={line.account}
              onChange={(_, value) => updateLine(index, { account: value })}
              getOptionLabel={accountLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              loading={accounts === null}
              loadingText={t('journalEntry.loadingAccounts')}
              size="small"
              sx={{ minWidth: 220, flexGrow: 1 }}
              renderInput={(params) => (
                <TextField {...params} label={t('journalEntry.line.account')} required />
              )}
            />
            <TextField
              select
              size="small"
              label={t('journalEntry.line.type')}
              value={line.type}
              onChange={(e) => updateLine(index, { type: e.target.value as EntryLineType })}
              sx={{ width: 110 }}
            >
              <MenuItem value="debit">{t('journalEntry.type.debit')}</MenuItem>
              <MenuItem value="credit">{t('journalEntry.type.credit')}</MenuItem>
            </TextField>
            <TextField
              size="small"
              label={t('journalEntry.line.amount')}
              value={line.amount}
              onChange={(e) => updateLine(index, { amount: e.target.value })}
              required
              sx={{ width: 120 }}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              size="small"
              label={t('journalEntry.line.vatRate')}
              value={line.vatRate}
              onChange={(e) => updateLine(index, { vatRate: e.target.value })}
              sx={{ width: 90 }}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              size="small"
              label={t('journalEntry.line.vatAmount')}
              value={line.vatAmount}
              onChange={(e) => updateLine(index, { vatAmount: e.target.value })}
              sx={{ width: 110 }}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              size="small"
              label={t('journalEntry.line.description')}
              value={line.description}
              onChange={(e) => updateLine(index, { description: e.target.value })}
              sx={{ minWidth: 140, flexGrow: 1 }}
            />
            <IconButton
              aria-label={t('journalEntry.removeLine')}
              disabled={lines.length <= 2}
              onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Box>
        ))}
        <Button
          startIcon={<AddIcon />}
          disabled={lines.length >= MAX_LINES}
          onClick={() => setLines((prev) => [...prev, emptyLine('debit')])}
        >
          {t('journalEntry.addLine')}
        </Button>

        <Typography
          sx={{
            mt: 2,
            color: balanced ? 'success.main' : 'text.secondary',
            fontWeight: balanced ? 600 : 400,
          }}
        >
          {t('journalEntry.balance.debit')}: {formatCurrency(balance.debit / 100, lang)}
          {' | '}
          {t('journalEntry.balance.credit')}: {formatCurrency(balance.credit / 100, lang)}
          {' | '}
          {balanced
            ? t('journalEntry.balance.balanced')
            : `${t('journalEntry.balance.difference')}: ${formatCurrency(balance.difference / 100, lang)}`}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>
          {busy ? t('journalEntry.submitting') : t('journalEntry.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
