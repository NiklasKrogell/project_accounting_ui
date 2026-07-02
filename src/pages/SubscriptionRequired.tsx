import { useAuth } from '../auth/AuthContext';

// Shown when the active company's subscription is not ACTIVE. The header
// (with the company switcher) stays visible, so a member of several companies
// can switch to a paid one.
export default function SubscriptionRequired() {
  const { activeMembership } = useAuth();

  return (
    <div className="card">
      <h1>Subscription required</h1>
      <p>
        <strong>{activeMembership?.companyName}</strong> does not have an active subscription
        {activeMembership ? ` (status: ${activeMembership.subscriptionStatus})` : ''}.
      </p>
      <p>
        To start using the app for this company, its subscription must be paid. Online payment is
        coming soon — until then, please contact support to activate the subscription.
      </p>
    </div>
  );
}
