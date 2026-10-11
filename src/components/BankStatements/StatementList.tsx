import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { BankStatement } from '../../types/bankStatement';
import { formatTimestampDate } from '../../lib/format';

// Which statements the list shows: those not yet marked posted, or all.
export type StatementFilter = 'unposted' | 'all';

interface StatementListProps {
  // Null while loading.
  statements: BankStatement[] | null;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  filter: StatementFilter;
  onFilterChange: (filter: StatementFilter) => void;
  selectedId: string | null;
  onSelect: (statement: BankStatement) => void;
  // Whether the user may import statements (LEDGER+).
  canManage: boolean;
  importing: boolean;
  onImport: (files: File[]) => void;
  error: string | null;
  lang: string;
}

// The right-hand side of the bank statement page while no PDF is open: the
// company's statements a page at a time, the unposted/all choice and the
// import button. Picking a row opens that statement.
export function StatementList({
  statements,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  canManage,
  importing,
  onImport,
  error,
  lang,
}: StatementListProps) {
  const { t } = useTranslation();
  // The file picker itself is hidden; the import button opens it.
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Cleared so that picking the same file again is still a change.
    e.target.value = '';
    if (files.length > 0) onImport(files);
  };

  const handleKeyDown = (statement: BankStatement) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(statement);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1">
            {t('bankStatements.title')}
          </Typography>
          {canManage && (
            <>
              <Button
                variant="contained"
                disabled={importing}
                onClick={() => fileInput.current?.click()}
              >
                {importing ? t('bankStatements.importing') : t('bankStatements.importButton')}
              </Button>
              <input
                ref={fileInput}
                type="file"
                hidden
                multiple
                accept="application/pdf,.pdf"
                aria-label={t('bankStatements.importButton')}
                onChange={handleFiles}
              />
            </>
          )}
        </Box>

        {!canManage && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('bankStatements.readOnlyNote')}
          </Typography>
        )}
        {error && (
          // One line per file that could not be imported.
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}

        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={filter}
          // Clicking the selected option reports null; keep the choice.
          onChange={(_, value: StatementFilter | null) => value && onFilterChange(value)}
          aria-label={t('bankStatements.filter.label')}
        >
          <ToggleButton value="unposted">{t('bankStatements.filter.unposted')}</ToggleButton>
          <ToggleButton value="all">{t('bankStatements.filter.all')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {statements === null ? (
          <Typography sx={{ p: 2 }}>{t('common.loading')}</Typography>
        ) : statements.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            {t(filter === 'unposted' ? 'bankStatements.emptyUnposted' : 'bankStatements.empty')}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t('bankStatements.columns.file')}</TableCell>
                  <TableCell>{t('bankStatements.columns.imported')}</TableCell>
                  <TableCell align="right">{t('bankStatements.columns.entries')}</TableCell>
                  <TableCell>{t('bankStatements.columns.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow
                    key={statement.id}
                    hover
                    selected={statement.id === selectedId}
                    aria-selected={statement.id === selectedId}
                    onClick={() => onSelect(statement)}
                    // Rows act as buttons, so they need to be reachable and
                    // activatable from the keyboard too.
                    tabIndex={0}
                    onKeyDown={handleKeyDown(statement)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ wordBreak: 'break-word' }}>
                      {statement.file.originalName}
                      {statement.bankAccount && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {statement.bankAccount.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatTimestampDate(statement.createdAt, lang)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {statement.entryCount}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statement.posted ? 'success' : 'default'}
                        variant={statement.posted ? 'filled' : 'outlined'}
                        label={t(
                          statement.posted
                            ? 'bankStatements.status.posted'
                            : 'bankStatements.status.unposted',
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[25, 50, 100]}
        sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
      />
    </Box>
  );
}
