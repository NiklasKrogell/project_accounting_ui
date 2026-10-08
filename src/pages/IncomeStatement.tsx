import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { fiscalYearsApi } from '../api/fiscalYears';
import { incomeStatementApi } from '../api/incomeStatement';
import type { FiscalYear } from '../types/fiscal';
import type { IncomeStatement as Statement } from '../types/incomeStatement';
import { comparisonRange, defaultFiscalYear, todayIso } from '../lib/reportPeriod';
import { IncomeStatementFilters } from '../components/IncomeStatement/IncomeStatementFilters';
import { IncomeStatementTable } from '../components/IncomeStatement/IncomeStatementTable';

// Income statement (tuloslaskelma): the period's income and expenses in the
// statutory expense-nature layout (PMA 1753/2015, Annex I), next to the
// previous period. Read-only, so everyone with access to the company can view
// it.
//
// A standalone report over a date range — it opens on the current fiscal year
// but any range can be chosen. It is not the income statement of the financial
// statements (tilinpäätös).
export default function IncomeStatement() {
  const { t, i18n } = useTranslation();
  const { activeMembership } = useAuth();
  const lang = i18n.language;
  const companyId = activeMembership?.companyId;

  // null until the company's fiscal years have loaded.
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[] | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showAccounts, setShowAccounts] = useState(true);
  const [grossResult, setGrossResult] = useState(false);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fiscal years drive the default period, so a company switch starts over:
  // the previous company's dates and figures must not linger.
  useEffect(() => {
    let cancelled = false;
    setFiscalYears(null);
    setStatement(null);
    setFrom('');
    setTo('');
    setError(null);
    fiscalYearsApi
      .list()
      .then((years) => {
        if (cancelled) return;
        setFiscalYears(years);
        const initial = defaultFiscalYear(years, todayIso());
        if (initial) {
          setFrom(initial.startDate);
          setTo(initial.endDate);
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const periodReady = fiscalYears !== null && from !== '' && to !== '' && from <= to;

  useEffect(() => {
    if (!periodReady || fiscalYears === null) return;
    let cancelled = false;
    setError(null);
    incomeStatementApi
      .get({ period: { from, to }, comparison: comparisonRange(from, to, fiscalYears) })
      .then((data) => {
        if (!cancelled) setStatement(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    // A slower response for an earlier period must not overwrite a newer one.
    return () => {
      cancelled = true;
    };
  }, [periodReady, from, to, fiscalYears]);

  const unallocatedItems =
    statement?.rows.flatMap((row) =>
      row.kind === 'item' && row.subItems.length > 0 && row.accounts.length > 0
        ? [t(`accountMainClass.${row.mainClass}`)]
        : [],
    ) ?? [];

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('incomeStatement.title')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {fiscalYears === null ? (
        !error && <Typography>{t('common.loading')}</Typography>
      ) : (
        <>
          <IncomeStatementFilters
            fiscalYears={fiscalYears}
            from={from}
            to={to}
            showAccounts={showAccounts}
            grossResult={grossResult}
            lang={lang}
            onPeriodChange={(newFrom, newTo) => {
              setFrom(newFrom);
              setTo(newTo);
            }}
            onShowAccountsChange={setShowAccounts}
            onGrossResultChange={setGrossResult}
          />

          {!periodReady ? (
            <Typography color="text.secondary">
              {from !== '' && to !== '' ? t('incomeStatement.invalidPeriod') : t('incomeStatement.noPeriod')}
            </Typography>
          ) : (
            <>
              {statement && statement.unclassified.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('incomeStatement.warnings.unclassified', {
                    accounts: statement.unclassified
                      .map((a) => `${a.accountNumber} ${a.accountName}`)
                      .join(', '),
                  })}
                </Alert>
              )}
              {unallocatedItems.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('incomeStatement.warnings.unallocated', {
                    items: unallocatedItems.join(', '),
                  })}
                </Alert>
              )}
              <IncomeStatementTable
                statement={statement}
                lang={lang}
                showAccounts={showAccounts}
                grossResult={grossResult}
              />
            </>
          )}
        </>
      )}
    </Box>
  );
}
