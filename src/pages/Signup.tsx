import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';

interface SignupProps {
  onShowLogin: () => void;
}

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
}

export default function Signup({ onShowLogin }: SignupProps) {
  const { signup } = useAuth();
  const [form, setForm] = useState<SignupFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(field: keyof SignupFormState) {
    return (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(form);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>Create your account</h1>
      <form onSubmit={handleSubmit}>
        <label>
          First name
          <input value={form.firstName} onChange={set('firstName')} required autoFocus />
        </label>
        <label>
          Last name
          <input value={form.lastName} onChange={set('lastName')} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Password (min 10 characters)
          <input type="password" value={form.password} onChange={set('password')} minLength={10} required />
        </label>
        <label>
          Company name
          <input value={form.companyName} onChange={set('companyName')} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
      </form>
      <p>
        Already have an account?{' '}
        <button className="link" type="button" onClick={onShowLogin}>Log in</button>
      </p>
    </div>
  );
}
