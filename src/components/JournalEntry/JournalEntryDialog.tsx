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
import { costCentersApi } from '../../api/costCenters';
import { journalEntriesApi } from '../../api/journalEntries';
import type { Account } from '../../types/account';
import { costCenterLabel, type CostCenter } from '../../types/costCenter';
import type { CreateJournalEntryInput, JournalEntry, VoucherType } from '../../types/journal';
import { VOUCHER_TYPES } from '../../types/journal';
import { formatCurrency } from '../../lib/format';

const MAX_LINES = 100;

// The VAT rates a line can be given, as LineDraft.vatRate strings.
const VAT_RATES = ['25.5', '13.5', '10', '0'];

// Fixed column widths shared by the header row and every line row so they
// line up like a spreadsheet. Account/cost center/description flex, the rest
// are fixed.
const LINE_GRID_COLUMNS =
  'minmax(200px, 2fr) 120px 110px 100px minmax(140px, 1.4fr) minmax(150px, 1.3fr) 40px';

// Inputs are kept as strings while editing; parsed on submit. The Account
// object (not just its id) is stored so the Autocomplete stays controlled.
// There's no separate debit/credit field: the amount's sign carries it
// (+ = debit, - = credit), same convention as most bookkeeping software.
// vatAmount isn't entered directly — it's derived from amount x vatRate.
// vatCode is a placeholder column: VAT codes aren't modeled anywhere in the
// backend yet, so it's purely local and never sent with the entry.
// costCenter is optional per line and never blocks submitting.
interface LineDraft {
  account: Account | null;
  costCenter: CostCenter | null;
  amount: string;
  vatRate: string;
  vatCode: string;
  description: string;
}

function emptyLine(): LineDraft {
  return { account: null, costCenter: null, amount: '', vatRate: '0', vatCode: '', description: '' };
}

// Local (not UTC) date so an evening entry defaults to the user's calendar day.
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Accepts Finnish comma decimals ('123,45' / '-123,45'). Returns null when not a number.
function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

// VAT amount in cents for a line, derived from its (signed) amount and VAT
// rate — null when either input doesn't parse yet.
function lineVatCents(line: LineDraft): number | null {
  const amount = parseAmount(line.amount);
  const vatRate = parseAmount(line.vatRate);
  if (amount === null || vatRate === null) return null;
  return Math.round(Math.abs(toCents(amount)) * (vatRate / 100));
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
  const [costCenters, setCostCenters] = useState<CostCenter[] | null>(null);

  const [voucherType, setVoucherType] = useState<VoucherType>('SALES');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset the form and (re)fetch accounts and cost centers every time the
  // dialog opens — this is trivially correct across company switches.
  useEffect(() => {
    if (!open) return;
    setVoucherType('SALES');
    setDate(todayIso());
    setDescription('');
    setLines([emptyLine(), emptyLine()]);
    setSubmitError(null);
    setAccounts(null);
    setAccountsError(null);
    accountsApi
      .list()
      .then(setAccounts)
      .catch((err) => setAccountsError((err as Error).message));
    setCostCenters(null);
    costCentersApi
      .list()
      .then(setCostCenters)
      .catch((err) => setAccountsError((err as Error).message));
  }, [open]);

  const balance = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      const amount = parseAmount(line.amount);
      if (amount === null) continue;
      const cents = toCents(amount);
      if (cents > 0) debit += cents;
      else if (cents < 0) credit += -cents;
    }
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  const balanced = balance.difference === 0 && balance.debit > 0 && balance.credit > 0;
  // Nothing entered yet vs. entered-but-mismatched get different colors below.
  const hasAnyAmount = balance.debit > 0 || balance.credit > 0;

  // Debit-side VAT is deductible (receivable, "Alv-saamiset"); credit-side
  // VAT is collected on behalf of the tax authority (payable, "Alv-velka").
  const vatSummary = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    for (const line of lines) {
      const amount = parseAmount(line.amount);
      const vatCents = lineVatCents(line);
      if (amount === null || vatCents === null) continue;
      if (amount > 0) receivable += vatCents;
      else if (amount < 0) payable += vatCents;
    }
    return { receivable, payable };
  }, [lines]);

  const linesValid = lines.every((line) => {
    const amount = parseAmount(line.amount);
    const vatRate = parseAmount(line.vatRate);
    return (
      line.account !== null &&
      amount !== null &&
      amount !== 0 &&
      vatRate !== null &&
      vatRate >= 0 &&
      vatRate <= 100
    );
  });

  const canSubmit = !busy && balanced && linesValid && description.trim().length > 0 && !!date;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setSubmitError(null);
    const input: CreateJournalEntryInput = {
      voucherType,
      date,
      description: description.trim(),
      // The backend's top-level accountId is a required "primary account" on
      // the voucher; there's no separate field for it in the UI since it'd
      // just duplicate a line — the first line's account stands in for it.
      accountId: lines[0].account!.id,
      lines: lines.map((line) => {
        const amount = parseAmount(line.amount)!;
        return {
          accountId: line.account!.id,
          costCenterId: line.costCenter?.id ?? null,
          amount: Math.abs(amount),
          description: line.description.trim() || undefined,
          vatRate: parseAmount(line.vatRate)!,
          vatAmount: lineVatCents(line)! / 100,
          type: amount < 0 ? 'credit' : 'debit',
        };
      }),
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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

        <Box sx={{ display: 'grid', gridTemplateColumns: LINE_GRID_COLUMNS, gap: 1, alignItems: 'end', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t('journalEntry.line.account')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('journalEntry.line.amount')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('journalEntry.line.vatRate')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('journalEntry.line.vatCode')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('journalEntry.line.description')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('journalEntry.line.costCenter')}
          </Typography>
          <span />
        </Box>

        {lines.map((line, index) => (
          <Box
            key={index}
            sx={{ display: 'grid', gridTemplateColumns: LINE_GRID_COLUMNS, gap: 1, mb: 1, alignItems: 'center' }}
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
              renderInput={(params) => <TextField {...params} fullWidth required />}
            />
            <TextField
              size="small"
              value={line.amount}
              onChange={(e) => updateLine(index, { amount: e.target.value })}
              placeholder="+100,00"
              required
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              select
              size="small"
              value={line.vatRate}
              onChange={(e) => updateLine(index, { vatRate: e.target.value })}
            >
              {VAT_RATES.map((rate) => (
                <MenuItem key={rate} value={rate}>
                  {rate.replace('.', ',')} %
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              value={line.vatCode}
              onChange={(e) => updateLine(index, { vatCode: e.target.value })}
            />
            <TextField
              size="small"
              value={line.description}
              onChange={(e) => updateLine(index, { description: e.target.value })}
            />
            <Autocomplete
              options={costCenters ?? []}
              value={line.costCenter}
              onChange={(_, value) => updateLine(index, { costCenter: value })}
              getOptionLabel={costCenterLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              loading={costCenters === null}
              loadingText={t('journalEntry.loadingCostCenters')}
              size="small"
              renderInput={(params) => <TextField {...params} fullWidth />}
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
          onClick={() => setLines((prev) => [...prev, emptyLine()])}
        >
          {t('journalEntry.addLine')}
        </Button>

        <Typography
          sx={{
            mt: 2,
            color: balanced ? 'success.main' : hasAnyAmount ? 'error.main' : 'text.secondary',
            fontWeight: balanced || hasAnyAmount ? 600 : 400,
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
        <Typography color="text.secondary">
          {t('journalEntry.vat.receivable')}: {formatCurrency(vatSummary.receivable / 100, lang)}
          {' | '}
          {t('journalEntry.vat.payable')}: {formatCurrency(vatSummary.payable / 100, lang)}
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
