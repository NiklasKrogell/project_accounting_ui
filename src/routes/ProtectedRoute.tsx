import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Guards routes that require an authenticated session. Subscription-status
// gating (showing SubscriptionRequired) happens inside Layout, not here,
// because the topbar must stay visible even when the subscription is inactive.
export default function ProtectedRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
