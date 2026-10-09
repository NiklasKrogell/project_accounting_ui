import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, CardContent, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { CompanyCreateDialog } from '../components/Company/CompanyCreateDialog';

// Shown when the session has no active company. Layout keeps the AppBar
// visible around this. There are two ways to get here:
// - The user belongs to no company at all: they have just signed up (signing
//   up registers the person only), or their last access was removed. They are
//   asked whether they want to register a company of their own; the other way
//   in is a company's administrator inviting them by their email, which they
//   answer in the inbox in the AppBar. With an invitation already waiting
//   there, they are pointed at it.
// - The user belongs to companies but none is selected (their access to the
//   one they were working in was removed, or they were added to their first
//   one while logged in): they pick one from the switcher in the AppBar.
export default function NoCompany() {
  const { t } = useTranslation();
  const { user, memberships, invitations } = useAuth();
  const [registering, setRegistering] = useState(false);

  if (memberships.length > 0) {
    return (
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {t('noCompany.title')}
          </Typography>
          <Typography>{t('noCompany.choose')}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ width: '100%', maxWidth: 480 }}>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('noCompany.title')}
        </Typography>
        <Typography sx={{ mb: 1 }}>{t('noCompany.notMember')}</Typography>
        {invitations.length > 0 ? (
          // Most who get here are waiting for exactly this.
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('noCompany.pendingInvitations', { count: invitations.length })}
          </Alert>
        ) : (
          <Typography sx={{ mb: 3 }}>{t('noCompany.askForAccess', { email: user?.email ?? '' })}</Typography>
        )}
        <Typography sx={{ mb: 2 }}>{t('noCompany.registerQuestion')}</Typography>
        <Button variant="contained" onClick={() => setRegistering(true)}>
          {t('companyCreate.open')}
        </Button>
      </CardContent>
      <CompanyCreateDialog open={registering} onClose={() => setRegistering(false)} />
    </Card>
  );
}
