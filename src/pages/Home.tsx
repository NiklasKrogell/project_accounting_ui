import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Card, CardContent, Typography } from '@mui/material';
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
    <Card>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {activeMembership?.companyName}
        </Typography>
        <Typography>
          {t('dashboard.roleLabel')}{' '}
          <strong>{activeMembership && t(`roles.${activeMembership.role}`)}</strong>
          {activeMembership?.isAdmin ? ` (${t('common.administrator')})` : ''}
        </Typography>
        {ping && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {t('dashboard.connected', { companyId: ping.companyId })}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Typography sx={{ mt: 2 }}>{t('dashboard.placeholder')}</Typography>
      </CardContent>
    </Card>
  );
}
