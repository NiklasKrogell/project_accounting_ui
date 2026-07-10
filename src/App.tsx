import { useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore: CSS import type declarations not available
import './App.css';
import './i18n';
import { changeLanguage, SUPPORTED_LANGUAGES, type Language } from './i18n';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SubscriptionRequired from './pages/SubscriptionRequired';
import Home from './pages/Home';
import FiscalYears from './pages/FiscalYears';

type View = 'dashboard' | 'fiscalYears';

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value as Language)}
      title={t('common.language')}
      aria-label={t('common.language')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <option key={lng} value={lng}>
          {t(`languages.${lng}`)}
        </option>
      ))}
    </select>
  );
}

function Shell() {
  const { t } = useTranslation();
  const { loading, user, memberships, activeCompanyId, activeMembership, logout, switchCompany } =
    useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [view, setView] = useState<View>('dashboard');

  if (loading) {
    return (
      <main className="center">
        <p>{t('common.loading')}</p>
      </main>
    );
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
        <span className="brand">{t('common.appName')}</span>
        {memberships.length > 0 && (
          <select
            value={activeCompanyId ?? ''}
            onChange={(e) => switchCompany(e.target.value)}
            title={t('nav.dashboard')}
          >
            {memberships.map((m) => (
              <option key={m.companyId} value={m.companyId}>
                {m.companyName}
                {m.subscriptionStatus !== 'ACTIVE' ? ` (${t('common.inactive')})` : ''}
              </option>
            ))}
          </select>
        )}
        <span className="spacer" />
        <LanguageSwitcher />
        <span>
          {user.firstName} {user.lastName}
        </span>
        <button type="button" onClick={logout}>
          {t('common.logout')}
        </button>
      </header>

      {subscriptionActive && (
        <nav className="tabs">
          <button
            type="button"
            className={view === 'dashboard' ? 'tab active' : 'tab'}
            onClick={() => setView('dashboard')}
          >
            {t('nav.dashboard')}
          </button>
          <button
            type="button"
            className={view === 'fiscalYears' ? 'tab active' : 'tab'}
            onClick={() => setView('fiscalYears')}
          >
            {t('nav.fiscalYears')}
          </button>
        </nav>
      )}

      <main className={subscriptionActive ? 'content' : 'center'}>
        {!subscriptionActive ? (
          <SubscriptionRequired />
        ) : view === 'fiscalYears' ? (
          <FiscalYears />
        ) : (
          <Home />
        )}
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
