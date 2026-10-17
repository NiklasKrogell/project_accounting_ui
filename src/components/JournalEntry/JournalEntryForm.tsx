import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import { accountsApi } from '../../api/accounts';
import { chartOfAccountsApi } from '../../api/chartOfAccounts';
import { companySettingsApi } from '../../api/companySettings';
import { costCentersApi } from '../../api/costCenters';
import { journalEntriesApi } from '../../api/journalEntries';
import type { Account, VatAccounts } from '../../types/account';
import type { CompanySettings } from '../../types/settings';
import { costCenterLabel, type CostCenter } from '../../types/costCenter';
import type {
  JournalEntry,
  UpdateJournalEntryInput,
  VatBasis,
  VoucherType,
} from '../../types/journal';
import { VOUCHER_TYPES } from '../../types/journal';
import { formatCurrency } from '../../lib/format';
import { amountText, parseAmount, toCents } from '../../lib/amount';
import { VAT_RATES, formatVatRate, vatCents, vatCentsInGross } from '../../lib/vat';

const MAX_LINES = 100;

// Fixed column widths shared by the header row and every line row so they
// line up like a spreadsheet. Account/cost center/description flex, the rest
// are fixed.
const LINE_GRID_COLUMNS =
  'minmax(200px, 2fr) 120px 110px 100px minmax(140px, 1.4fr) minmax(150px, 1.3fr) 40px';

// Inputs are kept as strings while editing; parsed on submit. The Account
// object (not just its id) is stored so the Autocomplete stays controlled.
// There's no separate debit/credit field: the amount's sign carries it
// (+ = debit, - = credit), same convention as most bookkeeping software.
// The VAT isn't entered: it's derived from the amount and vatRate, and on save
// the backend posts it as a row of its own on a VAT account (previewed below
// the lines). The form's net/gross toggle says how the amounts are entered:
// net, with the VAT added on top — so the entry has to balance with the VAT
// rows counted — or gross, with the VAT taken out of the amount. With the
// automatic VAT switch off no VAT rows are generated: the amounts are stored
// and balanced as entered, the VAT is booked as lines of its own, and vatRate
// only describes the line. vatRate is one of VAT_RATES as a string. Picking an
// account sets it to that account's default VAT rate (0 % when it has none);
// it can be changed afterwards, until another account is picked. A company
// that is not VAT-registered books no VAT at all: every VAT control is
// disabled for it and the lines stay at 0 %, whatever defaults its accounts
// have.
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

// A VAT row the backend will generate from the line at `index`, with that
// line's description and cost center. accountId is
// undefined until the VAT accounts have loaded and null when the company
// hasn't set the one this row needs.
interface VatRowPreview {
  index: number;
  debit: boolean;
  cents: number;
  description: string;
  costCenter: CostCenter | null;
  accountId: string | null | undefined;
}

function emptyLine(): LineDraft {
  return { account: null, costCenter: null, amount: '', vatRate: '0', vatCode: '', description: '' };
}

// Local (not UTC) date so an evening entry defaults to the user's calendar day.
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// VAT amount in cents for a line, derived from its (signed) amount and VAT
// rate — null when either input doesn't parse yet.
function lineVatCents(line: LineDraft, basis: VatBasis): number | null {
  const amount = parseAmount(line.amount);
  const vatRate = parseAmount(line.vatRate);
  if (amount === null || vatRate === null) return null;
  const cents = Math.abs(toCents(amount));
  return basis === 'gross' ? vatCentsInGross(cents, vatRate) : vatCents(cents, vatRate);
}

const accountLabel = (a: Account) => `${a.number} ${a.name}`;

// The lines of a saved entry as the form edits them: the entered ones only
// (the VAT rows are generated anew on save), each at its stored net amount
// with the sign carrying the side.
function draftsOf(entry: JournalEntry, accounts: Account[], costCenters: CostCenter[]): LineDraft[] {
  return entry.lines
    .filter((line) => !line.isVat)
    .map((line) => ({
      account: accounts.find((a) => a.id === line.accountId) ?? null,
      costCenter: costCenters.find((c) => c.id === line.costCenterId) ?? null,
      amount: amountText(line.type === 'credit' ? -line.amount : line.amount),
      vatRate: String(line.vatRate),
      vatCode: '',
      description: line.description,
    }));
}

// Whether a saved entry was booked with automatic VAT, which isn't stored:
// its VAT rows say so, and an entry without any VAT rate can be taken either
// way. Lines with a rate but no VAT rows had their VAT booked by hand.
function hadAutomaticVat(entry: JournalEntry): boolean {
  return entry.lines.some((line) => line.isVat) || entry.lines.every((line) => line.vatRate === 0);
}

// A line a new entry starts with. The account is picked once the accounts
// have loaded, if the line's account is still unpicked then.
export interface JournalEntryInitialLine {
  accountId?: string;
  // Signed as the amount field takes it: + debit, - credit.
  amount?: number;
}

// What a new entry starts with, when it is opened from somewhere that knows:
// the bank statement page gives the statement's bank account on the first
// line, and a statement transaction gives everything it says.
export interface JournalEntryInitial {
  date?: string;
  description?: string;
  vatBasis?: VatBasis;
  // There are always at least two lines; missing ones start empty.
  lines?: JournalEntryInitialLine[];
  // The bank statement the entry is booked from.
  bankStatementId?: string;
  // The statement transaction the entry books.
  bankStatementLineId?: string;
}

function initialDrafts(initial: JournalEntryInitial | undefined): LineDraft[] {
  const drafts = (initial?.lines ?? []).map((line) => ({
    ...emptyLine(),
    amount: line.amount === undefined ? '' : amountText(line.amount),
  }));
  while (drafts.length < 2) drafts.push(emptyLine());
  return drafts;
}

// A new entry or a saved one to change. The voucher type of a saved entry is
// fixed — the backend forbids changing it — and so is its bank statement.
export type JournalEntryFormTarget =
  | { mode: 'create'; initial?: JournalEntryInitial }
  | { mode: 'edit'; entry: JournalEntry };

// The form in three parts, for the host to lay out: a dialog puts them in its
// title, content and actions, a page in a panel of its own.
export interface JournalEntryFormParts {
  title: string;
  body: ReactNode;
  actions: ReactNode;
}

interface Props {
  // Read when the form mounts: a host that shows another entry gives the form
  // a new key.
  target: JournalEntryFormTarget;
  onCancel: () => void;
  onSaved?: (entry: JournalEntry) => void;
  children: (parts: JournalEntryFormParts) => ReactElement;
}

// The journal entry form: creates an entry or edits a saved one. It is shown
// in a dialog (JournalEntryDialog, the "Uusi kirjaus" action) and inside the
// bank statement page, next to the statement.
export default function JournalEntryForm({ target, onCancel, onSaved, children }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // The target the form was mounted for; see Props.target.
  const targetRef = useRef(target);
  const editedEntry = targetRef.current.mode === 'edit' ? targetRef.current.entry : null;
  const initial = targetRef.current.mode === 'create' ? targetRef.current.initial : undefined;

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[] | null>(null);
  const [vatAccounts, setVatAccounts] = useState<VatAccounts | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [voucherType, setVoucherType] = useState<VoucherType>(editedEntry?.voucherType ?? 'SALES');
  const [date, setDate] = useState(editedEntry?.date ?? initial?.date ?? todayIso());
  const [description, setDescription] = useState(
    editedEntry?.description ?? initial?.description ?? '',
  );
  const [vatBasis, setVatBasis] = useState<VatBasis>(initial?.vatBasis ?? 'net');
  const [automaticVat, setAutomaticVat] = useState(editedEntry ? hadAutomaticVat(editedEntry) : true);
  const [lines, setLines] = useState<LineDraft[]>(() => initialDrafts(initial));
  // A saved entry's lines can be shown only once the accounts and cost centers
  // they point at have loaded.
  const [linesReady, setLinesReady] = useState(editedEntry === null);

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch accounts, cost centers, the VAT accounts and the company settings
  // every time the form is mounted — this is trivially correct across company
  // switches.
  useEffect(() => {
    const mountedFor = targetRef.current;
    let stale = false;
    const fail = (err: unknown) => {
      if (!stale) setAccountsError((err as Error).message);
    };
    // Known once the company settings have arrived; an account prefilled
    // after that gets its default VAT rate here, one prefilled before gets it
    // below, with the settings.
    let vatRegistered = false;

    const accountsLoaded = accountsApi.list();
    const costCentersLoaded = costCentersApi.list();
    const settingsLoaded = companySettingsApi.get();

    accountsLoaded
      .then((list) => {
        if (stale) return;
        setAccounts(list);
        const initialAccountIds =
          mountedFor.mode === 'create'
            ? (mountedFor.initial?.lines ?? []).map((line) => line.accountId)
            : [];
        if (!initialAccountIds.some(Boolean)) return;
        // Only on a line whose account is still unpicked.
        setLines((prev) =>
          prev.map((line, index) => {
            const account = list.find((a) => a.id === initialAccountIds[index]);
            return account && line.account === null
              ? {
                  ...line,
                  account,
                  vatRate:
                    vatRegistered && account.defaultVatRate != null
                      ? String(account.defaultVatRate)
                      : '0',
                }
              : line;
          }),
        );
      })
      .catch(fail);
    costCentersLoaded
      .then((list) => {
        if (!stale) setCostCenters(list);
      })
      .catch(fail);
    chartOfAccountsApi
      .getVatAccounts()
      .then((loaded) => {
        if (!stale) setVatAccounts(loaded);
      })
      .catch(fail);
    settingsLoaded
      .then((settings) => {
        if (stale) return;
        vatRegistered = settings.vatRegistered;
        setCompanySettings(settings);
        // A line whose account was picked before this arrived missed its
        // default VAT rate. The rate couldn't be touched until now, so nothing
        // the user chose is overwritten. A saved entry's lines keep the rates
        // they were saved with.
        if (settings.vatRegistered && mountedFor.mode === 'create') {
          setLines((prev) =>
            prev.map((line) =>
              line.account?.defaultVatRate != null
                ? { ...line, vatRate: String(line.account.defaultVatRate) }
                : line,
            ),
          );
        }
      })
      .catch(fail);

    if (mountedFor.mode === 'edit') {
      Promise.all([accountsLoaded, costCentersLoaded, settingsLoaded])
        .then(([accountList, costCenterList]) => {
          if (stale) return;
          setLines(draftsOf(mountedFor.entry, accountList, costCenterList));
          setLinesReady(true);
        })
        // Each failure is already reported above.
        .catch(() => {});
    }

    return () => {
      stale = true;
    };
  }, []);

  // The backend refuses a line with a VAT rate from a company that is not
  // VAT-registered. The VAT controls also stay off until the settings have
  // loaded, so a rate can't be picked ahead of them.
  const vatEnabled = companySettings?.vatRegistered === true;
  const notVatRegistered = companySettings?.vatRegistered === false;

  // The VAT rate a line gets when `account` is picked for it: the account's
  // default, if it has one and the company books VAT.
  const defaultVatRateOf = (account: Account | null) =>
    vatEnabled && account?.defaultVatRate != null ? String(account.defaultVatRate) : '0';

  // The VAT rows the backend will generate, one per line that carries VAT, on
  // the side of that line: VAT on a debit is deductible (receivable,
  // "Alv-saamiset"); VAT on a credit is collected on behalf of the tax
  // authority (payable, "Alv-velka"). None when automatic VAT is off.
  const vatRows = useMemo(() => {
    const rows: VatRowPreview[] = [];
    if (!automaticVat) return rows;
    lines.forEach((line, index) => {
      const amount = parseAmount(line.amount);
      const cents = lineVatCents(line, vatBasis);
      if (amount === null || amount === 0 || cents === null || cents === 0) return;
      const debit = amount > 0;
      rows.push({
        index,
        debit,
        cents,
        description: line.description,
        costCenter: line.costCenter,
        accountId: debit ? vatAccounts?.vatReceivableAccountId : vatAccounts?.vatPayableAccountId,
      });
    });
    return rows;
  }, [lines, vatAccounts, vatBasis, automaticVat]);

  // Debit and credit totals of the entry as it will be stored. Net amounts get
  // their VAT rows added on top; gross amounts already contain them.
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
    if (vatBasis === 'net') {
      for (const row of vatRows) {
        if (row.debit) debit += row.cents;
        else credit += row.cents;
      }
    }
    return { debit, credit, difference: debit - credit };
  }, [lines, vatRows, vatBasis]);

  const balanced = balance.difference === 0 && balance.debit > 0 && balance.credit > 0;
  // Nothing entered yet vs. entered-but-mismatched get different colors below.
  const hasAnyAmount = balance.debit > 0 || balance.credit > 0;

  const vatSummary = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    for (const row of vatRows) {
      if (row.debit) receivable += row.cents;
      else payable += row.cents;
    }
    return { receivable, payable };
  }, [vatRows]);

  // The backend refuses a line with VAT when the VAT account of its side isn't
  // set, so say so up front instead of failing on save.
  const vatAccountMissing = vatRows.some((row) => row.accountId === null);

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

  const canSubmit =
    !busy &&
    linesReady &&
    balanced &&
    linesValid &&
    !vatAccountMissing &&
    description.trim().length > 0 &&
    !!date;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setSubmitError(null);
    const input: UpdateJournalEntryInput = {
      date,
      description: description.trim(),
      // The backend's top-level accountId is a required "primary account" on
      // the voucher; there's no separate field for it in the UI since it'd
      // just duplicate a line — the first line's account stands in for it.
      accountId: lines[0].account!.id,
      vatBasis,
      automaticVat,
      lines: lines.map((line) => {
        const amount = parseAmount(line.amount)!;
        return {
          accountId: line.account!.id,
          costCenterId: line.costCenter?.id ?? null,
          amount: Math.abs(amount),
          description: line.description.trim() || undefined,
          vatRate: parseAmount(line.vatRate)!,
          type: amount < 0 ? 'credit' : 'debit',
        };
      }),
    };
    const mountedFor = targetRef.current;
    try {
      const entry =
        mountedFor.mode === 'edit'
          ? await journalEntriesApi.update(mountedFor.entry.id, input)
          : await journalEntriesApi.create({
              voucherType,
              ...input,
              ...(mountedFor.initial?.bankStatementId
                ? { bankStatementId: mountedFor.initial.bankStatementId }
                : {}),
              ...(mountedFor.initial?.bankStatementLineId
                ? { bankStatementLineId: mountedFor.initial.bankStatementLineId }
                : {}),
            });
      onSaved?.(entry);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
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
          disabled={editedEntry !== null}
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
        <FormControlLabel
          control={
            <Switch
              checked={automaticVat}
              onChange={(e) => setAutomaticVat(e.target.checked)}
              disabled={!vatEnabled}
            />
          }
          label={t('journalEntry.automaticVat')}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary" id="journal-entry-vat-basis">
            {t('journalEntry.vatBasis.label')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            // Without automatic VAT nothing is added to or taken out of an
            // amount, so there is no basis to choose.
            disabled={!vatEnabled || !automaticVat}
            value={vatBasis}
            // Clicking the selected option reports null; keep the choice.
            onChange={(_, value: VatBasis | null) => value && setVatBasis(value)}
            aria-labelledby="journal-entry-vat-basis"
          >
            <ToggleButton value="net">{t('journalEntry.vatBasis.net')}</ToggleButton>
            <ToggleButton value="gross">{t('journalEntry.vatBasis.gross')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {notVatRegistered && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('journalEntry.vat.notRegistered')}
        </Alert>
      )}
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

      {!linesReady ? (
        <Typography color="text.secondary">{t('common.loading')}</Typography>
      ) : (
        // The line grid has a least width of its own: where the form is given
        // less (next to a bank statement), the lines scroll sideways.
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: LINE_GRID_COLUMNS, gap: 1, alignItems: 'end', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('journalEntry.line.account')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(
                !automaticVat || notVatRegistered
                  ? 'journalEntry.line.amountPlain'
                  : vatBasis === 'gross'
                    ? 'journalEntry.line.amountGross'
                    : 'journalEntry.line.amount',
              )}
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
                onChange={(_, value) =>
                  updateLine(index, { account: value, vatRate: defaultVatRateOf(value) })
                }
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
                // A rate a saved line still carries can be taken off even when
                // the company no longer books VAT: the backend would refuse it.
                disabled={!vatEnabled && line.vatRate === '0'}
              >
                {/* A saved line may carry a rate that is no longer on offer. */}
                {(VAT_RATES.some((rate) => String(rate) === line.vatRate)
                  ? VAT_RATES
                  : [Number(line.vatRate), ...VAT_RATES]
                ).map((rate) => (
                  <MenuItem key={rate} value={String(rate)}>
                    {formatVatRate(rate)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                value={line.vatCode}
                onChange={(e) => updateLine(index, { vatCode: e.target.value })}
                disabled={!vatEnabled}
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

          {vatRows.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {t('journalEntry.vat.rowsTitle')}
                {vatBasis === 'gross' && ` ${t('journalEntry.vat.grossHint')}`}
              </Typography>
              {vatAccountMissing && (
                <Alert severity="warning" sx={{ my: 1 }}>
                  {t('journalEntry.vat.accountMissing')}
                </Alert>
              )}
              {vatRows.map((row) => {
                const account = accounts?.find((a) => a.id === row.accountId);
                return (
                  <Box
                    key={row.index}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: LINE_GRID_COLUMNS,
                      gap: 1,
                      py: 0.5,
                      alignItems: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {account ? accountLabel(account) : '–'}
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency((row.debit ? row.cents : -row.cents) / 100, lang)}
                    </Typography>
                    {/* The row is the tax itself, so its VAT % and VAT code stay empty. */}
                    <span />
                    <span />
                    <Typography variant="body2" noWrap>
                      {row.description}
                    </Typography>
                    <Typography variant="body2" noWrap>
                      {row.costCenter ? costCenterLabel(row.costCenter) : ''}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}

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
      {automaticVat && !notVatRegistered && (
        <Typography color="text.secondary">
          {t('journalEntry.vat.receivable')}: {formatCurrency(vatSummary.receivable / 100, lang)}
          {' | '}
          {t('journalEntry.vat.payable')}: {formatCurrency(vatSummary.payable / 100, lang)}
        </Typography>
      )}
    </>
  );

  const actions = (
    <>
      <Button onClick={onCancel}>{t('common.cancel')}</Button>
      <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>
        {busy ? t('journalEntry.submitting') : t('journalEntry.submit')}
      </Button>
    </>
  );

  const title = editedEntry
    ? t('journalEntry.editTitle', {
        voucher: `${t(`voucherType.${editedEntry.voucherType}`)} #${editedEntry.voucherNumber}`,
      })
    : t('journalEntry.dialogTitle');

  return children({ title, body, actions });
}
