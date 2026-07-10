import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

interface LoginProps {
  onShowSignup: () => void;
}

export default function Login({ onShowSignup }: LoginProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>{t('auth.login.title')}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t('auth.login.email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          {t('auth.login.password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
      </form>
      <p>
        {t('auth.login.noAccount')}{' '}
        <button className="link" type="button" onClick={onShowSignup}>
          {t('auth.login.signUp')}
        </button>
      </p>
    </div>
  );
}
