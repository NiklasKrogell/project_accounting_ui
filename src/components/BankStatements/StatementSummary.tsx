import { useTranslation } from 'react-i18next';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { BankStatementSummary } from '../../types/bankStatement';
import { formatCurrency } from '../../lib/format';
import { formatVatRate } from '../../lib/vat';

interface StatementSummaryProps {
  // Null while loading.
  summary: BankStatementSummary | null;
  lang: string;
}

const numeric = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

// The foot of the left-hand side: what has been booked from the statement so
// far. The bank figures are the debits (panot) and credits (otot) the entries
// put on the bank account's accounting account; the VAT is that of the entered
// lines, by rate, purchases and sales apart. None of it is read from the PDF.
export function StatementSummary({ summary, lang }: StatementSummaryProps) {
  const { t } = useTranslation();

  if (!summary) {
    return <Typography color="text.secondary">{t('common.loading')}</Typography>;
  }
  const { vat } = summary;
  // Without a bank account nothing is on it yet.
  const bank = summary.bank ?? { deposits: 0, withdrawals: 0, net: 0 };

  // One row, to leave the entries above as much room as possible: the bank
  // account's figures on the left, the VAT on the right.
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
          {t('bankStatements.summary.title')}
        </Typography>
        <Typography sx={numeric}>
          {t('bankStatements.summary.deposits')}: {formatCurrency(bank.deposits, lang)}
          {' | '}
          {t('bankStatements.summary.withdrawals')}: {formatCurrency(bank.withdrawals, lang)}
          {' | '}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {t('bankStatements.summary.net')}: {formatCurrency(bank.net, lang)}
          </Box>
        </Typography>
      </Box>

      <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
          {t('bankStatements.summary.vatTitle')}
        </Typography>
        {vat.byRate.length === 0 ? (
          <Typography color="text.secondary">{t('bankStatements.summary.noVat')}</Typography>
        ) : (
          <>
            <Table size="small" sx={{ width: 'auto', mb: 0.5 }}>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell align="right">{t('bankStatements.summary.base')}</TableCell>
                  <TableCell align="right">{t('bankStatements.summary.vat')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vat.byRate.map((row) => (
                  <TableRow key={`${row.side}:${row.vatRate}`}>
                    <TableCell component="th" scope="row">
                      {t(
                        row.side === 'debit'
                          ? 'bankStatements.summary.purchases'
                          : 'bankStatements.summary.sales',
                        { rate: formatVatRate(row.vatRate) },
                      )}
                    </TableCell>
                    <TableCell align="right" sx={numeric}>
                      {formatCurrency(row.base, lang)}
                    </TableCell>
                    <TableCell align="right" sx={numeric}>
                      {formatCurrency(row.vat, lang)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography color="text.secondary" sx={numeric}>
              {t('bankStatements.summary.receivable')}: {formatCurrency(vat.receivable, lang)}
              {' | '}
              {t('bankStatements.summary.payable')}: {formatCurrency(vat.payable, lang)}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
