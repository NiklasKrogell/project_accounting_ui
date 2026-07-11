import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Guards /login and /signup: an already-authenticated user is sent to the
// dashboard instead of seeing the auth forms again.
export default function PublicOnlyRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
