import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { fiscalYearsApi } from '../api/fiscalYears';
import type { FiscalYear } from '../types/fiscal';
import { roleAtLeast } from '../lib/roles';
import { FiscalYearCard } from '../components/FiscalYears/FiscalYearCard';
import { NewFiscalYearForm } from '../components/FiscalYears/NewFiscalYearForm';

// Fiscal year management. Everyone with access can view; creating, closing,
// reopening and deleting require ACCOUNTANT+ (mirrors the backend). The whole
// list is reloaded after each mutation so it always reflects server state.
export default function FiscalYears() {
  const { t, i18n } = useTranslation();
  const { activeMembership } = useAuth();
  const canManage = roleAtLeast(activeMembership?.role, 'ACCOUNTANT');

  const [years, setYears] = useState<FiscalYear[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setYears(await fiscalYearsApi.list());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeMembership?.companyId]);

  // Runs a mutation keyed by an id (fiscal year or period) so only its buttons
  // show a busy state, then refreshes the list.
  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const lang = i18n.language;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('fiscalYears.title')}
        </Typography>
        {canManage && (
          <Button variant="contained" onClick={() => setShowForm((s) => !s)}>
            {t('fiscalYears.newButton')}
          </Button>
        )}
      </Box>

      {!canManage && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('fiscalYears.readOnlyNote')}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showForm && canManage && (
        <NewFiscalYearForm
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
          onError={setError}
        />
      )}

      {years === null ? (
        <Typography>{t('common.loading')}</Typography>
      ) : years.length === 0 ? (
        <Typography color="text.secondary">{t('fiscalYears.empty')}</Typography>
      ) : (
        years.map((fy) => (
          <FiscalYearCard key={fy.id} fy={fy} lang={lang} canManage={canManage} busyId={busyId} onRun={run} />
        ))
      )}
    </Box>
  );
}
