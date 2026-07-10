import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

// Shown when the active company's subscription is not ACTIVE. The header
// (with the company switcher) stays visible, so a member of several companies
// can switch to a paid one.
export default function SubscriptionRequired() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();

  return (
    <div className="card">
      <h1>{t('subscription.title')}</h1>
      <p>
        <strong>{activeMembership?.companyName}</strong>{' '}
        {t('subscription.statusNote', { status: activeMembership?.subscriptionStatus ?? '' })}
      </p>
      <p>{t('subscription.body')}</p>
    </div>
  );
}
