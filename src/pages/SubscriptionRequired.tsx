import { useTranslation } from 'react-i18next';
import { Card, CardContent, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';

// Shown when the active company's subscription is not ACTIVE. Layout keeps
// the AppBar (with the company switcher) visible around this, so a member of
// several companies can switch to a paid one.
export default function SubscriptionRequired() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();

  return (
    <Card sx={{ width: '100%', maxWidth: 480 }}>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('subscription.title')}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <strong>{activeMembership?.companyName}</strong>{' '}
          {t('subscription.statusNote', { status: activeMembership?.subscriptionStatus ?? '' })}
        </Typography>
        <Typography>{t('subscription.body')}</Typography>
      </CardContent>
    </Card>
  );
}
