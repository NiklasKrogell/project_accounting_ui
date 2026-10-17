import { useTranslation } from 'react-i18next';
import {
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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { BankStatementLine } from '../../types/bankStatement';
import { formatCurrency, formatDate } from '../../lib/format';

interface StatementLinesTableProps {
  // Null while loading.
  lines: BankStatementLine[] | null;
  lang: string;
  // Whether the user may book and delete transactions (LEDGER+).
  canManage: boolean;
  // A transaction being deleted.
  busyLineId: string | null;
  onBook: (line: BankStatementLine) => void;
  onOpenEntry: (line: BankStatementLine) => void;
  onDelete: (line: BankStatementLine) => void;
}

const numeric = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

// The statement's transactions, as imported from the bank's CSV, in date
// order. A booked one shows the voucher it was booked into (which opens it);
// an unbooked one can be booked or, imported by mistake, deleted.
export function StatementLinesTable({
  lines,
  lang,
  canManage,
  busyLineId,
  onBook,
  onOpenEntry,
  onDelete,
}: StatementLinesTableProps) {
  const { t } = useTranslation();

  if (lines === null) {
    return (
      <Card>
        <CardContent>
          <Typography>{t('common.loading')}</Typography>
        </CardContent>
      </Card>
    );
  }
  if (lines.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">{t('bankStatements.lines.empty')}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('bankStatements.lines.columns.date')}</TableCell>
              <TableCell>{t('bankStatements.lines.columns.counterparty')}</TableCell>
              <TableCell align="right">{t('bankStatements.lines.columns.amount')}</TableCell>
              <TableCell align="right">{t('bankStatements.lines.columns.entry')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => {
              const details = [
                line.transactionType,
                line.message ||
                  (line.reference ? `${t('bankStatements.lines.reference')} ${line.reference}` : ''),
              ]
                .filter(Boolean)
                .join(' · ');
              const voucher = line.journalEntry
                ? `${t(`voucherType.${line.journalEntry.voucherType}`)} #${line.journalEntry.voucherNumber}`
                : null;
              return (
                <TableRow key={line.id}>
                  <TableCell sx={numeric}>{formatDate(line.bookingDate, lang)}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-word' }}>
                    {line.counterparty || line.counterpartyAccount || '–'}
                    {details && (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {details}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={numeric}>
                    {formatCurrency(line.amount, lang)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {voucher ? (
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label={voucher}
                        {...(canManage
                          ? {
                              onClick: () => onOpenEntry(line),
                              'aria-label': t('bankStatements.lines.openEntry', { voucher }),
                            }
                          : {})}
                      />
                    ) : canManage ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Button size="small" variant="outlined" onClick={() => onBook(line)}>
                          {t('bankStatements.lines.book')}
                        </Button>
                        <IconButton
                          size="small"
                          aria-label={t('bankStatements.lines.delete')}
                          disabled={busyLineId === line.id}
                          onClick={() => onDelete(line)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('bankStatements.lines.unbooked')}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
