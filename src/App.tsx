import { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SubscriptionRequired from './pages/SubscriptionRequired';
import Home from './pages/Home';

function Shell() {
  const { loading, user, memberships, activeCompanyId, activeMembership, logout, switchCompany } =
    useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return <main className="center"><p>Loading…</p></main>;
  }

  if (!user) {
    return (
      <main className="center">
        {showSignup ? (
          <Signup onShowLogin={() => setShowSignup(false)} />
        ) : (
          <Login onShowSignup={() => setShowSignup(true)} />
        )}
      </main>
    );
  }

  const subscriptionActive = activeMembership?.subscriptionStatus === 'ACTIVE';

  return (
    <>
      <header className="topbar">
        <span className="brand">Project Accounting</span>
        {memberships.length > 0 && (
          <select
            value={activeCompanyId ?? ''}
            onChange={(e) => switchCompany(e.target.value)}
            title="Active company"
          >
            {memberships.map((m) => (
              <option key={m.companyId} value={m.companyId}>
                {m.companyName}
                {m.subscriptionStatus !== 'ACTIVE' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        )}
        <span className="spacer" />
        <span>{user.firstName} {user.lastName}</span>
        <button type="button" onClick={logout}>Log out</button>
      </header>
      <main className="center">
        {subscriptionActive ? <Home /> : <SubscriptionRequired />}
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
