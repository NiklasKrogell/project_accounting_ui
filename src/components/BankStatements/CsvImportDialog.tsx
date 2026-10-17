import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { bankStatementsApi } from '../../api/bankStatements';
import type {
  BankStatement,
  CsvField,
  CsvImportResult,
  CsvMapping,
  CsvPreview,
} from '../../types/bankStatement';
import { formatCurrency, formatDate } from '../../lib/format';
import { formatIban } from '../../lib/iban';

interface CsvImportDialogProps {
  open: boolean;
  statement: BankStatement;
  lang: string;
  onClose: () => void;
  onImported: (result: CsvImportResult) => void;
}

// The fields offered for choosing, in this order. A date or an amount comes
// from one column; the text fields may take several (the first non-empty one
// counts, a message joins them).
const FIELDS: Array<{ field: CsvField; multiple: boolean }> = [
  { field: 'bookingDate', multiple: false },
  { field: 'amount', multiple: false },
  { field: 'amountIn', multiple: false },
  { field: 'amountOut', multiple: false },
  { field: 'counterparty', multiple: true },
  { field: 'counterpartyAccount', multiple: true },
  { field: 'reference', multiple: false },
  { field: 'message', multiple: true },
  { field: 'transactionType', multiple: false },
  { field: 'archiveId', multiple: false },
  { field: 'valueDate', multiple: false },
];

// How many rows the preview lists; the rest are only counted.
const SHOWN_ROWS = 100;

// How long a change of column waits for the next one before the file is read
// again with them.
const REPREVIEW_DELAY_MS = 300;

// Importing a statement's transactions from the bank's CSV export of the
// account. The file is read by the server, which guesses the columns; the
// preview shows the guess, the rows it gives, the ones already imported and
// the ones that are no transactions, and a column can be chosen otherwise
// before anything is saved.
export function CsvImportDialog({ open, statement, lang, onClose, onImported }: CsvImportDialogProps) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  // The columns chosen by hand; null while the server's guess stands.
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every opening starts with no file.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview(null);
    setMapping(null);
    setError(null);
  }, [open]);

  // The file read with the columns chosen (or guessed); again after a change
  // of column has settled.
  useEffect(() => {
    if (!file) return;
    let stale = false;
    const timer = window.setTimeout(
      () => {
        setReading(true);
        setError(null);
        bankStatementsApi
          .csvPreview(statement.id, file, mapping ?? undefined)
          .then((loaded) => {
            if (!stale) setPreview(loaded);
          })
          .catch((err) => {
            if (!stale) setError((err as Error).message);
          })
          .finally(() => {
            if (!stale) setReading(false);
          });
      },
      mapping ? REPREVIEW_DELAY_MS : 0,
    );
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [file, mapping, statement.id]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    // Cleared so that picking the same file again is still a change.
    e.target.value = '';
    if (!picked) return;
    setPreview(null);
    setMapping(null);
    setFile(picked);
  };

  const current = mapping ?? preview?.mapping ?? {};
  const chooseColumns = (field: CsvField, columns: number[]) => {
    const next: CsvMapping = { ...current };
    if (columns.length > 0) next[field] = columns;
    else delete next[field];
    setMapping(next);
  };

  // What is missing is said here, in the user's language; the server's own
  // wording is only the fallback.
  const missing =
    preview === null
      ? null
      : !current.bookingDate?.length
        ? t('bankStatements.csv.needDate')
        : !current.amount?.length && !current.amountIn?.length && !current.amountOut?.length
          ? t('bankStatements.csv.needAmount')
          : preview.mappingProblem;
  const newLines = preview?.lines.filter((line) => !line.duplicate) ?? [];
  const canImport = !!file && !!preview && !missing && newLines.length > 0 && !reading && !importing;

  async function handleImport() {
    if (!file || !canImport) return;
    setImporting(true);
    setError(null);
    try {
      onImported(await bankStatementsApi.importCsv(statement.id, file, current));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const columnLabel = (index: number) => preview?.columns[index] || `#${index + 1}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('bankStatements.csv.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="outlined" onClick={() => fileInput.current?.click()} disabled={importing}>
            {t('bankStatements.csv.chooseFile')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".csv,.txt,text/csv,text/plain"
            aria-label={t('bankStatements.csv.chooseFile')}
            onChange={handleFile}
          />
          <Typography color="text.secondary">
            {file ? file.name : t('bankStatements.csv.fileHint')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {file && !preview && !error && <Typography>{t('bankStatements.csv.reading')}</Typography>}

        {preview && (
          <>
            <Alert severity={preview.layout ? 'success' : 'info'} sx={{ mb: 2 }}>
              {t(`bankStatements.csv.layout.${preview.layout ?? 'unknown'}`)}
            </Alert>
            {preview.accountMismatch && statement.bankAccount && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('bankStatements.csv.accountMismatch', {
                  found: formatIban(preview.accountMismatch),
                  expected: formatIban(statement.bankAccount.iban),
                })}
              </Alert>
            )}

            <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }}>
              {t('bankStatements.csv.columnsTitle')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 1.5,
                mb: 2,
              }}
            >
              {FIELDS.map(({ field, multiple }) => (
                <TextField
                  key={field}
                  select
                  size="small"
                  label={t(`bankStatements.csv.fields.${field}`)}
                  value={multiple ? (current[field] ?? []) : (current[field]?.[0] ?? '')}
                  onChange={(e) => {
                    const value = e.target.value as unknown;
                    const columns = Array.isArray(value)
                      ? (value as number[])
                      : value === '' ? [] : [Number(value)];
                    chooseColumns(field, columns);
                  }}
                  slotProps={{
                    select: {
                      multiple,
                      displayEmpty: true,
                      renderValue: (selected: unknown) => {
                        const columns = Array.isArray(selected)
                          ? (selected as number[])
                          : selected === '' ? [] : [Number(selected)];
                        return columns.length === 0
                          ? t('bankStatements.csv.none')
                          : columns.map(columnLabel).join(' + ');
                      },
                    },
                    inputLabel: { shrink: true },
                  }}
                >
                  {!multiple && <MenuItem value="">{t('bankStatements.csv.none')}</MenuItem>}
                  {preview.columns.map((_, index) => (
                    <MenuItem key={index} value={index}>
                      {columnLabel(index)}
                    </MenuItem>
                  ))}
                </TextField>
              ))}
            </Box>

            {missing ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {missing}
              </Alert>
            ) : preview.lines.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('bankStatements.csv.noLines')}
              </Alert>
            ) : (
              <TableContainer sx={{ mb: 1, maxHeight: 360 }}>
                <Table size="small" stickyHeader aria-label={t('bankStatements.csv.rowsLabel')}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('bankStatements.lines.columns.date')}</TableCell>
                      <TableCell>{t('bankStatements.lines.columns.counterparty')}</TableCell>
                      <TableCell>{t('bankStatements.csv.fields.message')}</TableCell>
                      <TableCell align="right">{t('bankStatements.lines.columns.amount')}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.lines.slice(0, SHOWN_ROWS).map((line) => (
                      <TableRow
                        key={line.lineNumber}
                        sx={line.duplicate ? { '& td': { color: 'text.disabled' } } : undefined}
                      >
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(line.bookingDate, lang)}
                        </TableCell>
                        <TableCell>{line.counterparty || line.counterpartyAccount}</TableCell>
                        <TableCell>{line.message || line.reference}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(line.amount, lang)}
                        </TableCell>
                        <TableCell>
                          {line.duplicate && <Chip size="small" label={t('bankStatements.csv.duplicate')} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!missing && preview.lines.length > SHOWN_ROWS && (
              <Typography color="text.secondary" variant="body2">
                {t('bankStatements.csv.more', { count: preview.lines.length - SHOWN_ROWS })}
              </Typography>
            )}
            {!missing && preview.skipped.length > 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                {t('bankStatements.csv.skipped', {
                  lines: preview.skipped
                    .map(({ lineNumber, reason }) => t(`bankStatements.csv.skipReason.${reason}`, { line: lineNumber }))
                    .join(', '),
                })}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!canImport} onClick={() => void handleImport()}>
          {importing
            ? t('bankStatements.csv.submitting')
            : t('bankStatements.csv.submit', { count: newLines.length })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
