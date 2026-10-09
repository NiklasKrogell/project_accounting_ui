import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useAuth } from '../../../auth/AuthContext';
import { companyUsersApi } from '../../../api/companyUsers';
import { companyInvitationsApi } from '../../../api/invitations';
import { formatTimestampDate } from '../../../lib/format';
import { assignableRoles, canManageMember, type MemberStanding } from '../../../lib/roles';
import type { CompanyUser } from '../../../types/companyUser';
import type { CompanyInvitation } from '../../../types/invitation';
import { TemporaryPasswordDialog, type IssuedCredentials } from './TemporaryPasswordDialog';
import { UserCreateDialog } from './UserCreateDialog';
import { UserRoleDialog } from './UserRoleDialog';

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`;

// Company settings for who has access to the company and what they may do. A
// list managed row by row, so like the bank accounts it is not built on
// SettingsSection: every change is saved at once and the list reloaded. The
// members belong to the active company, so they are reloaded whenever that
// changes. Everyone with access can view them. A company administrator
// (isAdmin, not an accounting role) adds users, removes their access and
// issues temporary passwords; whose role may be changed, and to what, follows
// src/lib/roles.ts. All of it mirrors the backend. Nobody acts on themselves.
//
// Adding an email that already has an account doesn't make its user a member
// but sends them an invitation, which they answer in their inbox. Those still
// unanswered are listed under the members, where a company administrator can
// cancel one.
export function UsersSettings() {
  const { t, i18n } = useTranslation();
  const { user, activeMembership } = useAuth();
  const companyId = activeMembership?.companyId;
  const isAdmin = activeMembership?.isAdmin ?? false;
  const me: MemberStanding | null =
    user && activeMembership ? { userId: user.id, role: activeMembership.role, isAdmin } : null;
  const canChangeRoles = me !== null && assignableRoles(me).length > 0;
  // Whether any row can have an action at all.
  const canManage = isAdmin || canChangeRoles;

  const [users, setUsers] = useState<CompanyUser[] | null>(null);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null);
  // Bumped after each mutation to reload the list.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setUsers(null);
    setInvitations([]);
    setError(null);
    setCreating(false);
    setEditing(null);
    setCredentials(null);
  }, [companyId]);

  useEffect(() => {
    // Guards against a slow response for the previous company landing after
    // the user has switched to another one.
    let stale = false;
    Promise.all([companyUsersApi.list(), companyInvitationsApi.list()])
      .then(([members, pending]) => {
        if (stale) return;
        setUsers(members);
        setInvitations(pending);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [companyId, version]);

  async function handleRemove(member: CompanyUser) {
    const confirmed = window.confirm(
      t('usersSettings.confirmRemove', {
        name: fullName(member),
        company: activeMembership?.companyName,
      }),
    );
    if (!confirmed) return;
    setBusyId(member.userId);
    setError(null);
    try {
      await companyUsersApi.remove(member.userId);
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelInvitation(invitation: CompanyInvitation) {
    const confirmed = window.confirm(
      t('usersSettings.invitations.confirmCancel', { name: fullName(invitation) }),
    );
    if (!confirmed) return;
    setBusyId(invitation.id);
    setError(null);
    try {
      await companyInvitationsApi.cancel(invitation.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
      // Also after a refusal: the invitation has then been answered meanwhile,
      // and the lists should say which way.
      setVersion((v) => v + 1);
    }
  }

  async function handleNewPassword(member: CompanyUser) {
    if (!window.confirm(t('usersSettings.confirmNewPassword', { name: fullName(member) }))) return;
    setBusyId(member.userId);
    setError(null);
    try {
      const { temporaryPassword } = await companyUsersApi.resetTemporaryPassword(member.userId);
      setCredentials({ email: member.email, temporaryPassword });
    } catch (err) {
      setError((err as Error).message);
      // Refused when the user has meanwhile set a password of their own:
      // reload so the row says so.
      setVersion((v) => v + 1);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {t('usersSettings.title')}
      </Typography>

      {!isAdmin && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t(canChangeRoles ? 'usersSettings.rolesOnlyNote' : 'usersSettings.readOnlyNote')}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Typography variant="h6" component="h2">
            {t('usersSettings.listTitle')}
          </Typography>
          {isAdmin && (
            <Button variant="contained" onClick={() => setCreating(true)}>
              {t('usersSettings.newButton')}
            </Button>
          )}
        </CardContent>
        {users === null ? (
          <CardContent>
            <Typography>{t('common.loading')}</Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('usersSettings.columns.name')}</TableCell>
                  <TableCell>{t('usersSettings.columns.email')}</TableCell>
                  <TableCell>{t('usersSettings.columns.role')}</TableCell>
                  {canManage && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((member) => {
                  const name = fullName(member);
                  const isMe = member.userId === me?.userId;
                  const busy = busyId === member.userId;
                  return (
                    <TableRow key={member.userId}>
                      <TableCell>
                        {name}
                        {isMe && <Chip size="small" label={t('usersSettings.you')} sx={{ ml: 1 }} />}
                        {member.pendingFirstLogin && (
                          <Chip size="small" label={t('usersSettings.pending')} sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {t(`roles.${member.role}`)}
                        {member.isAdmin && (
                          <Chip
                            size="small"
                            color="primary"
                            variant="outlined"
                            label={t('usersSettings.administrator')}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {isAdmin && member.pendingFirstLogin && (
                            <Button
                              size="small"
                              aria-label={t('usersSettings.newPasswordLabel', { name })}
                              disabled={busy}
                              onClick={() => void handleNewPassword(member)}
                            >
                              {t('usersSettings.newPassword')}
                            </Button>
                          )}
                          {me !== null && canManageMember(me, member) && (
                            <IconButton
                              size="small"
                              aria-label={t('usersSettings.editRole', { name })}
                              disabled={busy}
                              onClick={() => setEditing(member)}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          )}
                          {isAdmin && !isMe && (
                            <IconButton
                              size="small"
                              aria-label={t('usersSettings.remove', { name })}
                              disabled={busy}
                              onClick={() => void handleRemove(member)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {invitations.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2">
              {t('usersSettings.invitations.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('usersSettings.invitations.note')}
            </Typography>
          </CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('usersSettings.columns.name')}</TableCell>
                  <TableCell>{t('usersSettings.columns.email')}</TableCell>
                  <TableCell>{t('usersSettings.columns.role')}</TableCell>
                  <TableCell>{t('usersSettings.invitations.invited')}</TableCell>
                  {isAdmin && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((invitation) => {
                  const name = fullName(invitation);
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>{name}</TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {t(`roles.${invitation.role}`)}
                        {invitation.isAdmin && (
                          <Chip
                            size="small"
                            color="primary"
                            variant="outlined"
                            label={t('usersSettings.administrator')}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatTimestampDate(invitation.createdAt, i18n.language)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button
                            size="small"
                            aria-label={t('usersSettings.invitations.cancelLabel', { name })}
                            disabled={busyId === invitation.id}
                            onClick={() => void handleCancelInvitation(invitation)}
                          >
                            {t('usersSettings.invitations.cancel')}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <UserCreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(created) => {
          // No password means the email had an account, which was invited.
          setCredentials(
            created.invitation
              ? { email: created.invitation.email, temporaryPassword: null }
              : { email: created.member.email, temporaryPassword: created.temporaryPassword },
          );
          setVersion((v) => v + 1);
        }}
      />
      {me !== null && (
        <UserRoleDialog
          target={editing}
          actor={me}
          onClose={() => setEditing(null)}
          onSaved={() => setVersion((v) => v + 1)}
        />
      )}
      <TemporaryPasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Box>
  );
}
