import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface PingResponse {
  ok: boolean;
  companyId: string;
  role: string;
}

// Bare landing page proving gated data access: /api/ping only answers when the
// session is valid AND the active company's subscription is ACTIVE.
export default function Home() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const [ping, setPing] = useState<PingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PingResponse>('/api/ping').then(setPing).catch((err) => setError(err.message));
  }, [activeMembership?.companyId]);

  return (
    <div className="card">
      <h1>{activeMembership?.companyName}</h1>
      <p>
        {t('dashboard.roleLabel')} <strong>{activeMembership?.role}</strong>
        {activeMembership?.isAdmin ? ` (${t('common.administrator')})` : ''}
      </p>
      {ping && <p className="ok">{t('dashboard.connected', { companyId: ping.companyId })}</p>}
      {error && <p className="error">{error}</p>}
      <p>{t('dashboard.placeholder')}</p>
    </div>
  );
}
