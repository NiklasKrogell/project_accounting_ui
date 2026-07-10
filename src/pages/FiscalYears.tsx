import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
    <div className="page">
      <div className="page-head">
        <h1>{t('fiscalYears.title')}</h1>
        {canManage && (
          <button type="button" onClick={() => setShowForm((s) => !s)}>
            {t('fiscalYears.newButton')}
          </button>
        )}
      </div>

      {!canManage && <p className="muted">{t('fiscalYears.readOnlyNote')}</p>}
      {error && <p className="error">{error}</p>}

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
        <p>{t('common.loading')}</p>
      ) : years.length === 0 ? (
        <p className="muted">{t('fiscalYears.empty')}</p>
      ) : (
        years.map((fy) => (
          <FiscalYearCard
            key={fy.id}
            fy={fy}
            lang={lang}
            canManage={canManage}
            busyId={busyId}
            onRun={run}
          />
        ))
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PeriodStatus }) {
  const { t } = useTranslation();
  const cls = status === 'OPEN' ? 'badge badge-open' : 'badge badge-closed';
  return <span className={cls}>{t(`fiscalYears.status.${status}`)}</span>;
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
    <section className="card fiscal-year">
      <div className="fy-head">
        <div>
          <h2>{range}</h2>
          <p className="muted">
            {t('fiscalYears.granularityLabel', {
              value: t(`fiscalYears.granularity.${fy.granularity}`),
            })}
          </p>
        </div>
        <StatusBadge status={fy.status} />
      </div>

      {canManage && (
        <div className="fy-actions">
          {isOpen ? (
            <button
              type="button"
              disabled={!allPeriodsClosed || busyId === fy.id}
              title={!allPeriodsClosed ? t('fiscalYears.hints.closeYearBlocked') : undefined}
              onClick={() => onRun(fy.id, () => fiscalYearsApi.close(fy.id))}
            >
              {t('fiscalYears.actions.closeYear')}
            </button>
          ) : (
            <button
              type="button"
              disabled={busyId === fy.id}
              onClick={() => onRun(fy.id, () => fiscalYearsApi.reopen(fy.id))}
            >
              {t('fiscalYears.actions.reopenYear')}
            </button>
          )}
          {isOpen && (
            <button
              type="button"
              className="danger"
              disabled={busyId === fy.id}
              onClick={() => {
                if (window.confirm(t('fiscalYears.confirmDelete', { range }))) {
                  onRun(fy.id, () => fiscalYearsApi.remove(fy.id));
                }
              }}
            >
              {t('fiscalYears.actions.deleteYear')}
            </button>
          )}
        </div>
      )}

      <h3>{t('fiscalYears.periodsTitle')}</h3>
      <table className="periods">
        <tbody>
          {fy.periods.map((p) => (
            <tr key={p.id}>
              <td>{t('fiscalYears.period', { index: p.index })}</td>
              <td>{formatDateRange(p.startDate, p.endDate, lang)}</td>
              <td>
                <StatusBadge status={p.status} />
              </td>
              <td className="right">
                {canManage &&
                  isOpen &&
                  (p.status === 'OPEN' ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyId === p.id}
                      onClick={() => onRun(p.id, () => fiscalYearsApi.closePeriod(p.id))}
                    >
                      {t('fiscalYears.actions.closePeriod')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyId === p.id}
                      onClick={() => onRun(p.id, () => fiscalYearsApi.reopenPeriod(p.id))}
                    >
                      {t('fiscalYears.actions.reopenPeriod')}
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
    <form className="card fy-form" onSubmit={handleSubmit}>
      <h2>{t('fiscalYears.form.title')}</h2>
      <div className="fy-form-row">
        <label>
          {t('fiscalYears.form.startDate')}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label>
          {t('fiscalYears.form.endDate')}
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </label>
        <label>
          {t('fiscalYears.form.granularity')}
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as PeriodGranularity)}>
            <option value="MONTH">{t('fiscalYears.granularity.MONTH')}</option>
            <option value="QUARTER">{t('fiscalYears.granularity.QUARTER')}</option>
          </select>
        </label>
      </div>
      <button type="submit" disabled={busy}>
        {busy ? t('fiscalYears.form.submitting') : t('fiscalYears.form.submit')}
      </button>
    </form>
  );
}
