import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { GeneralLedgerAccount } from '../../types/generalLedger';
import { LedgerAccountRows } from './LedgerAccountRows';

interface LedgerTableProps {
  accounts: GeneralLedgerAccount[] | null;
  lang: string;
  costCenterLabel: (id: string | null) => string;
  // Counts ACCOUNTS, not rows — pagination is per account.
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export function LedgerTable({
  accounts,
  lang,
  costCenterLabel,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: LedgerTableProps) {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    if (!accounts) return null;
    return accounts.map((account) => (
      <LedgerAccountRows
        key={account.accountId}
        account={account}
        lang={lang}
        costCenterLabel={costCenterLabel}
      />
    ));
  }, [accounts, lang, costCenterLabel]);

  return (
    <Card>
      {accounts === null ? (
        <CardContent>
          <Typography>{t('common.loading')}</Typography>
        </CardContent>
      ) : accounts.length === 0 ? (
        <CardContent>
          <Typography color="text.secondary">{t('generalLedger.empty')}</Typography>
        </CardContent>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('generalLedger.columns.date')}</TableCell>
                <TableCell>{t('generalLedger.columns.voucher')}</TableCell>
                <TableCell>{t('generalLedger.columns.description')}</TableCell>
                <TableCell align="right">{t('generalLedger.columns.debit')}</TableCell>
                <TableCell align="right">{t('generalLedger.columns.credit')}</TableCell>
                <TableCell align="right">{t('generalLedger.columns.balance')}</TableCell>
                <TableCell>{t('generalLedger.columns.costCenter')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{rows}</TableBody>
          </Table>
        </TableContainer>
      )}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[25, 50, 100]}
        // The count is accounts, not rows; label it so the number isn't misread.
        labelRowsPerPage={t('generalLedger.accountsPerPage')}
      />
    </Card>
  );
}
