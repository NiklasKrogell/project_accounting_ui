import { useTranslation } from 'react-i18next';
import { Box, Chip, TableCell, TableRow, Typography } from '@mui/material';
import type { GeneralLedgerAccount } from '../../types/generalLedger';
import { formatCurrency, formatDate } from '../../lib/format';

interface LedgerAccountRowsProps {
  account: GeneralLedgerAccount;
  lang: string;
  costCenterLabel: (id: string | null) => string;
}

const numeric = { fontVariantNumeric: 'tabular-nums' } as const;

// One account's block within the ledger table: a header row, its opening
// balance, one indented row per posting with a running balance, and a closing
// row carrying the period totals. Returns a fragment of rows (same shape as
// Journal's EntryRows) so every account shares the one table's columns.
export function LedgerAccountRows({ account, lang, costCenterLabel }: LedgerAccountRowsProps) {
  const { t } = useTranslation();

  return (
    <>
      <TableRow sx={{ backgroundColor: 'action.hover' }}>
        <TableCell colSpan={7}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, ...numeric }}>
              {account.accountNumber} {account.accountName}
            </Typography>
            {account.accountGroup && (
              <Chip size="small" variant="outlined" label={account.accountGroup.name} />
            )}
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={5} sx={{ pl: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {t('generalLedger.openingBalance')}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={numeric}>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(account.openingBalance, lang)}
          </Typography>
        </TableCell>
        <TableCell />
      </TableRow>

      {account.lines.map((line) => (
        <TableRow key={line.id}>
          <TableCell sx={{ pl: 4, whiteSpace: 'nowrap', ...numeric }}>
            {formatDate(line.date, lang)}
          </TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>
            {t(`voucherType.${line.voucherType}`)} #{line.voucherNumber}
          </TableCell>
          <TableCell>{line.description || line.entryDescription}</TableCell>
          <TableCell align="right" sx={numeric}>
            {line.debit !== 0 ? formatCurrency(line.debit, lang) : ''}
          </TableCell>
          <TableCell align="right" sx={numeric}>
            {line.credit !== 0 ? formatCurrency(line.credit, lang) : ''}
          </TableCell>
          <TableCell align="right" sx={numeric}>
            {formatCurrency(line.runningBalance, lang)}
          </TableCell>
          <TableCell>{costCenterLabel(line.costCenterId)}</TableCell>
        </TableRow>
      ))}

      <TableRow>
        <TableCell colSpan={3} sx={{ pl: 4, fontWeight: 600 }}>
          {t('generalLedger.closingBalance')}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, ...numeric }}>
          {formatCurrency(account.debitTotal, lang)}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, ...numeric }}>
          {formatCurrency(account.creditTotal, lang)}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 600, ...numeric }}>
          {formatCurrency(account.closingBalance, lang)}
        </TableCell>
        <TableCell />
      </TableRow>
    </>
  );
}
