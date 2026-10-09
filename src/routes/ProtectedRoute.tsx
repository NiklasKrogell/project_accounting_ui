import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ChangePassword from '../pages/ChangePassword';

// Guards routes that require an authenticated session. Subscription-status
// gating (showing SubscriptionRequired) happens inside Layout, not here,
// because the topbar must stay visible even when the subscription is inactive.
export default function ProtectedRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // An account created with a temporary password sees nothing of the app
  // until its user has set a password of their own; the backend refuses
  // everything else as well. Not a route of its own, so that whatever page
  // was asked for opens once the password is changed.
  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  return <Outlet />;
}
