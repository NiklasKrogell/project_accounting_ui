import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Chip, TableCell, TableRow, Typography } from '@mui/material';
import type { JournalEntry } from '../../types/journal';
import { formatCurrency, formatDate } from '../../lib/format';

interface EntryRowsProps {
  entry: JournalEntry;
  lang: string;
  accountLabel: (id: string) => string;
  costCenterLabel: (id: string | null) => string;
  // Buttons acting on the entry, shown at the end of its header row.
  actions?: ReactNode;
}

// One header row per entry (date, voucher chip, description) followed by its
// indented lines. No expand/collapse — prototype-simple.
export function EntryRows({ entry, lang, accountLabel, costCenterLabel, actions }: EntryRowsProps) {
  const { t } = useTranslation();
  // Lines carry no stored order, so put the generated VAT rows after the
  // entered ones (the sort is stable, so each kind keeps its relative order).
  const lines = [...entry.lines].sort((a, b) => Number(a.isVat) - Number(b.isVat));
  return (
    <>
      <TableRow sx={{ backgroundColor: 'action.hover' }}>
        <TableCell colSpan={6}>
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
            {actions && <Box sx={{ ml: 'auto', display: 'flex' }}>{actions}</Box>}
          </Box>
        </TableCell>
      </TableRow>
      {lines.map((line) => (
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
          <TableCell>{costCenterLabel(line.costCenterId)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}
