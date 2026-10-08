import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { fiscalYearsApi } from '../api/fiscalYears';
import { balanceSheetApi } from '../api/balanceSheet';
import type { FiscalYear } from '../types/fiscal';
import type { BalanceSheet as Sheet } from '../types/balanceSheet';
import { formatCurrency } from '../lib/format';
import { comparisonDate, defaultFiscalYear, todayIso } from '../lib/reportPeriod';
import { BalanceSheetFilters } from '../components/BalanceSheet/BalanceSheetFilters';
import { BalanceSheetTable } from '../components/BalanceSheet/BalanceSheetTable';

// Balance sheet (tase): assets against equity and liabilities at the end of a
// day, in the statutory layout (PMA 1753/2015, Annex V), next to the previous
// fiscal year's closing date. Read-only, so everyone with access to the
// company can view it.
//
// A standalone report for any date — it opens on the last day of the current
// fiscal year. It is not the balance sheet of the financial statements
// (tilinpäätös).
export default function BalanceSheet() {
  const { t, i18n } = useTranslation();
  const { activeMembership } = useAuth();
  const lang = i18n.language;
  const companyId = activeMembership?.companyId;

  // null until the company's fiscal years have loaded.
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[] | null>(null);
  const [date, setDate] = useState('');
  const [showAccounts, setShowAccounts] = useState(true);
  const [abridged, setAbridged] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fiscal years drive the default date, so a company switch starts over: the
  // previous company's date and figures must not linger.
  useEffect(() => {
    let cancelled = false;
    setFiscalYears(null);
    setSheet(null);
    setDate('');
    setError(null);
    fiscalYearsApi
      .list()
      .then((years) => {
        if (cancelled) return;
        setFiscalYears(years);
        // Without fiscal years there is still a balance sheet: today's.
        setDate(defaultFiscalYear(years, todayIso())?.endDate ?? todayIso());
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const dateReady = fiscalYears !== null && date !== '';

  useEffect(() => {
    if (!dateReady || fiscalYears === null) return;
    let cancelled = false;
    setError(null);
    balanceSheetApi
      .get({ date, comparisonDate: comparisonDate(date, fiscalYears) })
      .then((data) => {
        if (!cancelled) setSheet(data);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    // A slower response for an earlier date must not overwrite a newer one.
    return () => {
      cancelled = true;
    };
  }, [dateReady, date, fiscalYears]);

  const unallocatedSections =
    sheet?.sides.flatMap((side) =>
      side.classes.flatMap((section) =>
        section.accounts.length > 0 ? [t(`accountMainClass.${section.mainClass}`)] : [],
      ),
    ) ?? [];

  // Either column out of balance; the larger one is the one worth naming.
  const difference = sheet
    ? [sheet.difference.amount, sheet.difference.comparisonAmount ?? 0].reduce((a, b) =>
        Math.abs(b) > Math.abs(a) ? b : a,
      )
    : 0;

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('balanceSheet.title')}
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
          <BalanceSheetFilters
            fiscalYears={fiscalYears}
            date={date}
            showAccounts={showAccounts}
            abridged={abridged}
            lang={lang}
            onDateChange={setDate}
            onShowAccountsChange={setShowAccounts}
            onAbridgedChange={setAbridged}
          />

          {!dateReady ? (
            <Typography color="text.secondary">{t('balanceSheet.noDate')}</Typography>
          ) : (
            <>
              {sheet && sheet.unclassified.length > 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('balanceSheet.warnings.unclassified', {
                    accounts: sheet.unclassified
                      .map((a) => `${a.accountNumber} ${a.accountName}`)
                      .join(', '),
                    difference: formatCurrency(Math.abs(difference), lang),
                  })}
                </Alert>
              ) : (
                difference !== 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('balanceSheet.warnings.unbalanced', {
                      difference: formatCurrency(Math.abs(difference), lang),
                    })}
                  </Alert>
                )
              )}
              {unallocatedSections.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('balanceSheet.warnings.unallocated', {
                    items: unallocatedSections.join(', '),
                  })}
                </Alert>
              )}
              <BalanceSheetTable
                sheet={sheet}
                lang={lang}
                showAccounts={showAccounts}
                abridged={abridged}
              />
            </>
          )}
        </>
      )}
    </Box>
  );
}
