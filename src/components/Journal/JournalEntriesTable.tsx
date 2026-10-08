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
import type { JournalEntry } from '../../types/journal';
import { EntryRows } from './EntryRows';

interface JournalEntriesTableProps {
  entries: JournalEntry[] | null;
  lang: string;
  accountLabel: (id: string) => string;
  costCenterLabel: (id: string | null) => string;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export function JournalEntriesTable({
  entries,
  lang,
  accountLabel,
  costCenterLabel,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: JournalEntriesTableProps) {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    if (!entries) return null;
    return entries.map((entry) => (
      <EntryRows
        key={entry.id}
        entry={entry}
        lang={lang}
        accountLabel={accountLabel}
        costCenterLabel={costCenterLabel}
      />
    ));
  }, [entries, lang, accountLabel, costCenterLabel]);

  return (
    <Card>
      {entries === null ? (
        <CardContent>
          <Typography>{t('common.loading')}</Typography>
        </CardContent>
      ) : entries.length === 0 ? (
        <CardContent>
          <Typography color="text.secondary">{t('journal.empty')}</Typography>
        </CardContent>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('journal.columns.account')}</TableCell>
                <TableCell>{t('journal.columns.description')}</TableCell>
                <TableCell align="right">{t('journal.columns.debit')}</TableCell>
                <TableCell align="right">{t('journal.columns.credit')}</TableCell>
                <TableCell align="right">{t('journal.columns.vat')}</TableCell>
                <TableCell>{t('journal.columns.costCenter')}</TableCell>
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
      />
    </Card>
  );
}
