import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { fiscalYearsApi } from '../api/fiscalYears';
import type { FiscalYear, PeriodGranularity, PeriodStatus } from '../types/fiscal';
import { roleAtLeast } from '../lib/roles';
import { formatDateRange } from '../lib/format';

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

function StatusBadge({ status }: { status: PeriodStatus }) {
  const { t } = useTranslation();
  return (
    <Chip size="small" label={t(`fiscalYears.status.${status}`)} color={status === 'OPEN' ? 'success' : 'error'} />
  );
}

interface FiscalYearCardProps {
  fy: FiscalYear;
  lang: string;
  canManage: boolean;
  busyId: string | null;
  onRun: (id: string, action: () => Promise<unknown>) => void;
}

function FiscalYearCard({ fy, lang, canManage, busyId, onRun }: FiscalYearCardProps) {
  const { t } = useTranslation();
  const isOpen = fy.status === 'OPEN';
  const allPeriodsClosed = fy.periods.every((p) => p.status === 'CLOSED');
  const range = formatDateRange(fy.startDate, fy.endDate, lang);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" component="h2">
              {range}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('fiscalYears.granularityLabel', { value: t(`fiscalYears.granularity.${fy.granularity}`) })}
            </Typography>
          </Box>
          <StatusBadge status={fy.status} />
        </Box>

        {canManage && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
            {isOpen ? (
              <Button
                variant="outlined"
                disabled={!allPeriodsClosed || busyId === fy.id}
                title={!allPeriodsClosed ? t('fiscalYears.hints.closeYearBlocked') : undefined}
                onClick={() => onRun(fy.id, () => fiscalYearsApi.close(fy.id))}
              >
                {t('fiscalYears.actions.closeYear')}
              </Button>
            ) : (
              <Button
                variant="outlined"
                disabled={busyId === fy.id}
                onClick={() => onRun(fy.id, () => fiscalYearsApi.reopen(fy.id))}
              >
                {t('fiscalYears.actions.reopenYear')}
              </Button>
            )}
            {isOpen && (
              <Button
                variant="outlined"
                color="error"
                disabled={busyId === fy.id}
                onClick={() => {
                  if (window.confirm(t('fiscalYears.confirmDelete', { range }))) {
                    onRun(fy.id, () => fiscalYearsApi.remove(fy.id));
                  }
                }}
              >
                {t('fiscalYears.actions.deleteYear')}
              </Button>
            )}
          </Box>
        )}

        <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>
          {t('fiscalYears.periodsTitle')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              {fy.periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{t('fiscalYears.period', { index: p.index })}</TableCell>
                  <TableCell>{formatDateRange(p.startDate, p.endDate, lang)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell align="right">
                    {canManage &&
                      isOpen &&
                      (p.status === 'OPEN' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === p.id}
                          onClick={() => onRun(p.id, () => fiscalYearsApi.closePeriod(p.id))}
                        >
                          {t('fiscalYears.actions.closePeriod')}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === p.id}
                          onClick={() => onRun(p.id, () => fiscalYearsApi.reopenPeriod(p.id))}
                        >
                          {t('fiscalYears.actions.reopenPeriod')}
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

interface NewFiscalYearFormProps {
  onCreated: () => void;
  onError: (message: string) => void;
}

function NewFiscalYearForm({ onCreated, onError }: NewFiscalYearFormProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [granularity, setGranularity] = useState<PeriodGranularity>('MONTH');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await fiscalYearsApi.create({ startDate, endDate, granularity });
      onCreated();
    } catch (err) {
      onError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {t('fiscalYears.form.title')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField
              type="date"
              label={t('fiscalYears.form.startDate')}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              label={t('fiscalYears.form.endDate')}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label={t('fiscalYears.form.granularity')}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as PeriodGranularity)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="MONTH">{t('fiscalYears.granularity.MONTH')}</MenuItem>
              <MenuItem value="QUARTER">{t('fiscalYears.granularity.QUARTER')}</MenuItem>
            </TextField>
          </Box>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('fiscalYears.form.submitting') : t('fiscalYears.form.submit')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
