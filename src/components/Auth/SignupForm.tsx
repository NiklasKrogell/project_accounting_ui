import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  businessId: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;
}

export function SignupForm() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [form, setForm] = useState<SignupFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    businessId: '',
    billingEmail: '',
    billingAddress: '',
    billingCity: '',
    billingPostalCode: '',
    billingCountry: '',
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
    <Card sx={{ width: '100%', maxWidth: 480 }}>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('auth.signup.title')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('auth.signup.firstName')}
            value={form.firstName}
            onChange={set('firstName')}
            required
            autoFocus
            fullWidth
          />
          <TextField
            label={t('auth.signup.lastName')}
            value={form.lastName}
            onChange={set('lastName')}
            required
            fullWidth
          />
          <TextField
            type="email"
            label={t('auth.signup.email')}
            value={form.email}
            onChange={set('email')}
            required
            fullWidth
          />
          <TextField
            type="password"
            label={t('auth.signup.passwordHint')}
            value={form.password}
            onChange={set('password')}
            slotProps={{ htmlInput: { minLength: 10 } }}
            required
            fullWidth
          />
          <TextField
            label={t('auth.signup.companyName')}
            value={form.companyName}
            onChange={set('companyName')}
            required
            fullWidth
          />
          <TextField
            label={t('auth.signup.businessId')}
            value={form.businessId}
            onChange={set('businessId')}
            required
            fullWidth
          />
          <TextField
            type="email"
            label={t('auth.signup.billingEmail')}
            value={form.billingEmail}
            onChange={set('billingEmail')}
            required
            fullWidth
          />
          <TextField
            label={t('auth.signup.billingAddress')}
            value={form.billingAddress}
            onChange={set('billingAddress')}
            required
            fullWidth
          />
          <TextField
            label={t('auth.signup.billingCity')}
            value={form.billingCity}
            onChange={set('billingCity')}
            required
            fullWidth
          />
          <TextField
            label={t('auth.signup.billingPostalCode')}
            value={form.billingPostalCode}
            onChange={set('billingPostalCode')}
            required
            fullWidth
          />
          <TextField
            label={t('auth.signup.billingCountry')}
            value={form.billingCountry}
            onChange={set('billingCountry')}
            required
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </Button>
        </Box>
        <Typography sx={{ mt: 2 }}>
          {t('auth.signup.haveAccount')}{' '}
          <Link component={RouterLink} to="/login">
            {t('auth.signup.logIn')}
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
