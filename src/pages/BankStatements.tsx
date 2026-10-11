import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { accountsApi } from '../api/accounts';
import { bankAccountsApi } from '../api/bankAccounts';
import { bankStatementsApi } from '../api/bankStatements';
import { costCentersApi } from '../api/costCenters';
import { StatementEntriesPanel } from '../components/BankStatements/StatementEntriesPanel';
import { StatementList, type StatementFilter } from '../components/BankStatements/StatementList';
import { StatementPdfViewer } from '../components/BankStatements/StatementPdfViewer';
import type { Account } from '../types/account';
import type { BankAccount } from '../types/bankAccount';
import type { BankStatement } from '../types/bankStatement';
import { costCenterLabel, type CostCenter } from '../types/costCenter';
import { roleAtLeast } from '../lib/roles';

// Bank statements (tiliotteet): PDFs the company has imported, booked by hand
// next to the PDF. The page is two panes that scroll on their own (Layout
// gives it the whole area under the tabs). On the right, the list of
// statements — or, once one is picked, its PDF in place of the list. On the
// left, the picked statement: its bank account, the journal entries booked
// from it (with the entry form shown in place when one is written) and their
// sums. Everyone with access can view; importing and booking require LEDGER+
// (mirrors the backend).
export default function BankStatements() {
  const { t, i18n } = useTranslation();
  const { activeMembership } = useAuth();
  const companyId = activeMembership?.companyId;
  const canManage = roleAtLeast(activeMembership?.role, 'LEDGER');
  const lang = i18n.language;

  const [statements, setStatements] = useState<BankStatement[] | null>(null);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<StatementFilter>('unposted');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  // Bumped after each change to reload the list.
  const [version, setVersion] = useState(0);

  // The statement being worked on. Kept as it is rather than looked up in the
  // list: one marked posted leaves the unposted list while it is still open.
  const [selected, setSelected] = useState<BankStatement | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  // Whether the left pane has an entry being written (see handleSelect).
  const editingRef = useRef(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[] | null>(null);
  const [accountsById, setAccountsById] = useState<Map<string, Account>>(new Map());
  const [costCentersById, setCostCentersById] = useState<Map<string, CostCenter>>(new Map());

  // Everything here belongs to the active company.
  useEffect(() => {
    setStatements(null);
    setSelected(null);
    setPdfOpen(false);
    setPage(0);
    setError(null);
    setBankAccounts(null);
  }, [companyId]);

  useEffect(() => {
    // Guards against a slow response for the previous company (or the
    // previous page) landing after the user has moved on.
    let stale = false;
    bankStatementsApi
      .list({
        ...(filter === 'unposted' ? { posted: false } : {}),
        take: rowsPerPage,
        skip: page * rowsPerPage,
      })
      .then(({ data, meta }) => {
        if (stale) return;
        // A statement marked posted may have been the last one of the last
        // page of the unposted ones.
        if (data.length === 0 && meta.total > 0 && page > 0) {
          setPage(Math.ceil(meta.total / rowsPerPage) - 1);
          return;
        }
        setStatements(data);
        setTotal(meta.total);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [companyId, filter, page, rowsPerPage, version]);

  // The bank accounts for the left pane's picker, and the accounts and cost
  // centers its entry rows are labelled with.
  useEffect(() => {
    let stale = false;
    const fail = (err: unknown) => {
      if (!stale) setError((err as Error).message);
    };
    bankAccountsApi
      .list()
      .then((list) => {
        if (!stale) setBankAccounts(list);
      })
      .catch(fail);
    accountsApi
      .list()
      .then((accounts) => {
        if (!stale) setAccountsById(new Map(accounts.map((a) => [a.id, a])));
      })
      .catch(fail);
    costCentersApi
      .list()
      .then((costCenters) => {
        if (!stale) setCostCentersById(new Map(costCenters.map((c) => [c.id, c])));
      })
      .catch(fail);
    return () => {
      stale = true;
    };
  }, [companyId]);

  const accountLabel = useCallback(
    (id: string) => {
      const account = accountsById.get(id);
      return account ? `${account.number} ${account.name}` : '';
    },
    [accountsById],
  );

  const costCenterLabelById = useCallback(
    (id: string | null) => {
      const costCenter = id ? costCentersById.get(id) : undefined;
      return costCenter ? costCenterLabel(costCenter) : '';
    },
    [costCentersById],
  );

  // Filter changes reset pagination so results always start from page one.
  const applyFilter = (value: StatementFilter) => {
    setFilter(value);
    setPage(0);
  };

  // One request per file, so a file that is refused doesn't take the others
  // with it. The new statements are unposted and the newest, so they are on
  // the first page whichever filter is on.
  async function handleImport(files: File[]) {
    setImporting(true);
    setError(null);
    const failures: string[] = [];
    for (const file of files) {
      try {
        await bankStatementsApi.import(file);
      } catch (err) {
        failures.push(
          t('bankStatements.importFailed', { name: file.name, message: (err as Error).message }),
        );
      }
    }
    setImporting(false);
    if (failures.length > 0) setError(failures.join('\n'));
    setPage(0);
    setVersion((v) => v + 1);
  }

  // Picking a statement opens its PDF in place of the list; picking the one
  // already open brings its PDF back after it was closed.
  const handleSelect = (statement: BankStatement) => {
    if (
      selected &&
      statement.id !== selected.id &&
      editingRef.current &&
      !window.confirm(t('bankStatements.discardConfirm'))
    ) {
      return;
    }
    setSelected(statement);
    setPdfOpen(true);
  };

  // The answer to a save may arrive after another statement was picked.
  const handleStatementChange = useCallback((updated: BankStatement) => {
    setSelected((current) => (current?.id === updated.id ? updated : current));
    setVersion((v) => v + 1);
  }, []);

  const handleEntriesChange = useCallback(() => setVersion((v) => v + 1), []);

  const handleEditingChange = useCallback((editing: boolean) => {
    editingRef.current = editing;
  }, []);

  return (
    <Box sx={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}>
      {/* The entry form's line grid is wide, so the left pane gets the larger share. */}
      <Box
        component="section"
        aria-label={t('bankStatements.entries.title')}
        sx={{
          flex: '3 1 0',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        {selected ? (
          <StatementEntriesPanel
            key={selected.id}
            statement={selected}
            bankAccounts={bankAccounts}
            accountLabel={accountLabel}
            costCenterLabel={costCenterLabelById}
            canManage={canManage}
            lang={lang}
            onStatementChange={handleStatementChange}
            onEntriesChange={handleEntriesChange}
            onEditingChange={handleEditingChange}
          />
        ) : (
          <Typography color="text.secondary" sx={{ p: 3 }}>
            {t('bankStatements.selectHint')}
          </Typography>
        )}
      </Box>

      <Box
        component="section"
        aria-label={t('bankStatements.title')}
        sx={{ flex: '2 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        {pdfOpen && selected ? (
          <StatementPdfViewer
            fileId={selected.file.id}
            fileName={selected.file.originalName}
            onClose={() => setPdfOpen(false)}
          />
        ) : (
          <StatementList
            statements={statements}
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(0);
            }}
            filter={filter}
            onFilterChange={applyFilter}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
            canManage={canManage}
            importing={importing}
            onImport={(files) => void handleImport(files)}
            error={error}
            lang={lang}
          />
        )}
      </Box>
    </Box>
  );
}
