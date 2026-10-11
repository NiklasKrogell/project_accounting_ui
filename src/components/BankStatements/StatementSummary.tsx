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
  const { bank, vat } = summary;

  return (
    <Box>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
        {t('bankStatements.summary.title')}
      </Typography>
      {bank ? (
        <Typography sx={numeric}>
          {t('bankStatements.summary.deposits')}: {formatCurrency(bank.deposits, lang)}
          {' | '}
          {t('bankStatements.summary.withdrawals')}: {formatCurrency(bank.withdrawals, lang)}
          {' | '}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {t('bankStatements.summary.net')}: {formatCurrency(bank.net, lang)}
          </Box>
        </Typography>
      ) : (
        <Typography color="text.secondary">{t('bankStatements.summary.noBankAccount')}</Typography>
      )}

      <Typography variant="subtitle2" component="h3" sx={{ mt: 1.5, mb: 0.5 }}>
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
  );
}
