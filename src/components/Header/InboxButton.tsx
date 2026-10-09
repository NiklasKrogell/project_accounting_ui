import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Box, Button, Divider, IconButton, Popover, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import { useAuth } from '../../auth/AuthContext';
import { invitationsApi } from '../../api/invitations';
import { formatTimestampDate } from '../../lib/format';
import type { Invitation } from '../../types/invitation';

// The user's inbox, opened from the AppBar: what is waiting for their answer,
// for now invitations to companies. It lives in the AppBar because that is
// shown in every state of the session, also to a user who has no company yet
// and is waiting to be invited to one. The invitations come with the session
// (useAuth().invitations) and are re-read each time the inbox is opened.
// Accepting one changes the user's companies, so the whole session is re-read
// after it; the backend takes a user without an active company into the new
// one, and Layout follows.
export function InboxButton() {
  const { t, i18n } = useTranslation();
  const { invitations, refreshSession, refreshInvitations } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleOpen(e: MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
    setError(null);
    void refreshInvitations();
  }

  async function answer(invitation: Invitation, accept: boolean) {
    setBusyId(invitation.id);
    setError(null);
    try {
      if (accept) {
        await invitationsApi.accept(invitation.id);
        await refreshSession();
      } else {
        await invitationsApi.decline(invitation.id);
        await refreshInvitations();
      }
      // Nothing left to answer.
      if (invitations.length <= 1) setAnchorEl(null);
    } catch (err) {
      setError((err as Error).message);
      // Refused when the invitation was cancelled or answered elsewhere
      // meanwhile: show what is still there.
      await refreshInvitations();
    } finally {
      setBusyId(null);
    }
  }

  const count = invitations.length;

  return (
    <>
      <IconButton
        color="inherit"
        aria-label={count > 0 ? t('inbox.labelWithCount', { count }) : t('inbox.title')}
        title={t('inbox.title')}
        onClick={handleOpen}
        sx={{ mr: 2 }}
      >
        <Badge badgeContent={count} color="secondary">
          <InboxIcon />
        </Badge>
      </IconButton>
      <Popover
        open={anchorEl !== null}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { role: 'dialog', 'aria-label': t('inbox.title'), sx: { width: 380, maxWidth: '100%' } },
        }}
      >
        <Typography variant="h6" component="h2" sx={{ px: 2, pt: 2, pb: 1 }}>
          {t('inbox.title')}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
            {error}
          </Alert>
        )}
        {count === 0 && (
          <Typography color="text.secondary" sx={{ px: 2, pb: 2 }}>
            {t('inbox.empty')}
          </Typography>
        )}
        {invitations.map((invitation) => {
          const company = invitation.companyName;
          const date = formatTimestampDate(invitation.createdAt, i18n.language);
          const busy = busyId === invitation.id;
          return (
            <Box key={invitation.id}>
              <Divider />
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" component="h3">
                  {t('inbox.invitation.title', { company })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('inbox.invitation.businessId', { businessId: invitation.businessId })}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t(invitation.isAdmin ? 'inbox.invitation.bodyAdmin' : 'inbox.invitation.body', {
                    role: t(`roles.${invitation.role}`),
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {invitation.invitedBy
                    ? t('inbox.invitation.from', { name: invitation.invitedBy, date })
                    : date}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    aria-label={t('inbox.invitation.acceptLabel', { company })}
                    disabled={busy}
                    onClick={() => void answer(invitation, true)}
                  >
                    {t('inbox.invitation.accept')}
                  </Button>
                  <Button
                    size="small"
                    aria-label={t('inbox.invitation.declineLabel', { company })}
                    disabled={busy}
                    onClick={() => void answer(invitation, false)}
                  >
                    {t('inbox.invitation.decline')}
                  </Button>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Popover>
    </>
  );
}
