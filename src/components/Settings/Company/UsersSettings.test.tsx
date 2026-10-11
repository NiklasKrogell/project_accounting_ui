import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../../i18n';
import { companyUsersApi } from '../../../api/companyUsers';
import { companyInvitationsApi } from '../../../api/invitations';
import { useAuth } from '../../../auth/AuthContext';
import type { AuthContextValue, Role } from '../../../types/auth';
import type { CompanyUser } from '../../../types/companyUser';
import type { CompanyInvitation } from '../../../types/invitation';
import { UsersSettings } from './UsersSettings';

jest.mock('../../../api/companyUsers');
jest.mock('../../../api/invitations');
jest.mock('../../../auth/AuthContext');

const member = (
  userId: string,
  firstName: string,
  lastName: string,
  role: Role,
  extra: Partial<CompanyUser> = {},
): CompanyUser => ({
  userId,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}@esimerkki.fi`,
  role,
  isAdmin: false,
  joinedAt: '',
  pendingFirstLogin: false,
  ...extra,
});

// A company administrator with the lowest accounting role: the two are
// independent.
const OWNER = member('owner', 'Anna', 'Virtanen', 'VIEWER', { isAdmin: true });
const ACCOUNTANT = member('acc', 'Bertta', 'Koski', 'ACCOUNTANT');
const LEDGER = member('led', 'Cecilia', 'Laine', 'LEDGER');
const NEWCOMER = member('new', 'Daavid', 'Niemi', 'VIEWER', { pendingFirstLogin: true });
const MEMBERS = [OWNER, ACCOUNTANT, LEDGER, NEWCOMER];

// Someone with an account of their own, invited but yet to answer.
const INVITATION: CompanyInvitation = {
  id: 'inv',
  userId: 'old',
  firstName: 'Fanni',
  lastName: 'Aalto',
  email: 'tili@toimisto.fi',
  role: 'ACCOUNTANT',
  isAdmin: false,
  invitedBy: 'Anna Virtanen',
  // Midday, so the date is the same in whatever time zone the tests run.
  createdAt: '2026-10-09T12:00:00.000Z',
};

function mockAuth(as: CompanyUser, companyId = 'company-a') {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: as.userId },
    activeMembership: { companyId, companyName: 'Esimerkki Oy', role: as.role, isAdmin: as.isAdmin },
  } as unknown as AuthContextValue);
}

const rowOf = (name: string) => within(screen.getByRole('row', { name: new RegExp(`^${name}`) }));
const editButton = (name: string) => `Muokkaa käyttäjän ${name} roolia`;
const removeButton = (name: string) => `Poista käyttäjän ${name} pääsy`;
const newPasswordButton = (name: string) => `Luo käyttäjälle ${name} uusi väliaikainen salasana`;
const cancelButton = (name: string) => `Peru käyttäjän ${name} kutsu`;

function pickRole(name: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Rooli' }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(name));
}

const writeText = jest.fn();

beforeEach(() => {
  jest.mocked(companyUsersApi.list).mockResolvedValue(MEMBERS);
  jest.mocked(companyUsersApi.update).mockResolvedValue(LEDGER);
  jest.mocked(companyUsersApi.remove).mockResolvedValue(undefined);
  jest.mocked(companyInvitationsApi.list).mockResolvedValue([]);
  jest.mocked(companyInvitationsApi.cancel).mockResolvedValue(undefined);
  writeText.mockReset().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("lists the active company's members with their roles", async () => {
  mockAuth(OWNER);
  render(<UsersSettings />);

  expect(await screen.findByText('Anna Virtanen')).toBeInTheDocument();
  const owner = rowOf('Anna Virtanen');
  expect(owner.getByText('Sinä')).toBeInTheDocument();
  expect(owner.getByText('anna@esimerkki.fi')).toBeInTheDocument();
  expect(owner.getByText('Katselija')).toBeInTheDocument();
  expect(owner.getByText('Ylläpitäjä')).toBeInTheDocument();
  // Nobody acts on themselves.
  expect(owner.queryByRole('button')).not.toBeInTheDocument();

  const accountant = rowOf('Bertta Koski');
  expect(accountant.getByText('Kirjanpitäjä')).toBeInTheDocument();
  expect(accountant.queryByText('Ylläpitäjä')).not.toBeInTheDocument();
  expect(accountant.queryByText('Ei vielä kirjautunut')).not.toBeInTheDocument();
  expect(accountant.getByRole('button', { name: editButton('Bertta Koski') })).toBeInTheDocument();
  expect(accountant.getByRole('button', { name: removeButton('Bertta Koski') })).toBeInTheDocument();
  expect(accountant.queryByRole('button', { name: 'Uusi salasana' })).not.toBeInTheDocument();

  const newcomer = rowOf('Daavid Niemi');
  expect(newcomer.getByText('Ei vielä kirjautunut')).toBeInTheDocument();
  expect(newcomer.getByRole('button', { name: newPasswordButton('Daavid Niemi') })).toBeInTheDocument();
});

test('adds a user and shows the temporary password, which can be copied', async () => {
  mockAuth(OWNER);
  const added = member('eva', 'Eeva', 'Salo', 'LEDGER', { pendingFirstLogin: true });
  jest
    .mocked(companyUsersApi.create)
    .mockResolvedValue({ member: added, temporaryPassword: 'K7QM-3XPD-9RTW-HV2F', invitation: null });
  render(<UsersSettings />);
  await screen.findByText('Anna Virtanen');

  fireEvent.click(screen.getByRole('button', { name: 'Lisää käyttäjä' }));
  const dialog = within(await screen.findByRole('dialog'));
  const submit = dialog.getByRole('button', { name: 'Lisää käyttäjä' });
  expect(submit).toBeDisabled();

  fireEvent.change(dialog.getByLabelText(/^Sähköposti/), { target: { value: ' eeva@esimerkki.fi ' } });
  fireEvent.change(dialog.getByLabelText(/^Etunimi/), { target: { value: 'Eeva' } });
  fireEvent.change(dialog.getByLabelText(/^Sukunimi/), { target: { value: ' Salo ' } });
  pickRole('Reskontranhoitaja');
  expect(submit).toBeEnabled();

  jest.mocked(companyUsersApi.list).mockResolvedValue([...MEMBERS, added]);
  fireEvent.click(submit);
  await waitFor(() =>
    expect(companyUsersApi.create).toHaveBeenCalledWith({
      email: 'eeva@esimerkki.fi',
      firstName: 'Eeva',
      lastName: 'Salo',
      role: 'LEDGER',
      isAdmin: false,
    }),
  );

  // The password dialog takes the place of the form, and the list is reloaded.
  const credentials = within(await screen.findByRole('dialog', { name: 'Väliaikainen salasana' }));
  expect(credentials.getByLabelText('Sähköposti')).toHaveValue('eeva@esimerkki.fi');
  expect(credentials.getByLabelText('Väliaikainen salasana')).toHaveValue('K7QM-3XPD-9RTW-HV2F');
  fireEvent.click(credentials.getByRole('button', { name: 'Kopioi salasana' }));
  expect(writeText).toHaveBeenCalledWith('K7QM-3XPD-9RTW-HV2F');
  expect(await credentials.findByRole('status')).toHaveTextContent('Kopioitu');

  fireEvent.click(credentials.getByRole('button', { name: 'Sulje' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Eeva Salo')).toBeInTheDocument();
  expect(screen.queryByText('K7QM-3XPD-9RTW-HV2F')).not.toBeInTheDocument();
});

test('can make the new user a company administrator', async () => {
  mockAuth(OWNER);
  jest
    .mocked(companyUsersApi.create)
    .mockResolvedValue({ member: OWNER, temporaryPassword: 'x', invitation: null });
  render(<UsersSettings />);
  await screen.findByText('Anna Virtanen');

  fireEvent.click(screen.getByRole('button', { name: 'Lisää käyttäjä' }));
  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(/^Sähköposti/), { target: { value: 'eeva@esimerkki.fi' } });
  fireEvent.change(dialog.getByLabelText(/^Etunimi/), { target: { value: 'Eeva' } });
  fireEvent.change(dialog.getByLabelText(/^Sukunimi/), { target: { value: 'Salo' } });
  fireEvent.click(dialog.getByLabelText('Yrityksen ylläpitäjä'));
  fireEvent.click(dialog.getByRole('button', { name: 'Lisää käyttäjä' }));

  await waitFor(() =>
    expect(companyUsersApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'VIEWER', isAdmin: true }),
    ),
  );
});

test('tells when the email already had an account, which is invited and gets no password', async () => {
  mockAuth(OWNER);
  jest
    .mocked(companyUsersApi.create)
    .mockResolvedValue({ member: null, temporaryPassword: null, invitation: INVITATION });
  render(<UsersSettings />);
  await screen.findByText('Anna Virtanen');
  expect(screen.queryByRole('heading', { name: 'Odottavat kutsut' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Lisää käyttäjä' }));
  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(/^Sähköposti/), { target: { value: 'tili@toimisto.fi' } });
  fireEvent.change(dialog.getByLabelText(/^Etunimi/), { target: { value: 'Tili' } });
  fireEvent.change(dialog.getByLabelText(/^Sukunimi/), { target: { value: 'Toimisto' } });
  jest.mocked(companyInvitationsApi.list).mockResolvedValue([INVITATION]);
  fireEvent.click(dialog.getByRole('button', { name: 'Lisää käyttäjä' }));

  const sent = within(await screen.findByRole('dialog', { name: 'Kutsu lähetetty' }));
  expect(sent.getByText(/tili@toimisto.fi on jo tili, joten henkilölle lähetettiin kutsu/)).toBeInTheDocument();
  expect(sent.queryByLabelText('Väliaikainen salasana')).not.toBeInTheDocument();
  expect(sent.queryByRole('button', { name: 'Kopioi salasana' })).not.toBeInTheDocument();

  // Not among the members, but waiting under them.
  fireEvent.click(sent.getByRole('button', { name: 'Sulje' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'Odottavat kutsut' })).toBeInTheDocument();
  expect(rowOf('Fanni Aalto').getByText('tili@toimisto.fi')).toBeInTheDocument();
  expect(screen.getAllByRole('row', { name: /^Fanni Aalto/ })).toHaveLength(1);
});

test('lists the pending invitations, which a company administrator can cancel', async () => {
  mockAuth(OWNER);
  jest.mocked(companyInvitationsApi.list).mockResolvedValue([INVITATION]);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<UsersSettings />);

  expect(await screen.findByRole('heading', { name: 'Odottavat kutsut' })).toBeInTheDocument();
  const invited = rowOf('Fanni Aalto');
  expect(invited.getByText('tili@toimisto.fi')).toBeInTheDocument();
  expect(invited.getByText('Kirjanpitäjä')).toBeInTheDocument();
  expect(invited.getByText(/^0?9\.10\.2026$/)).toBeInTheDocument();
  // An invitation has no role to edit and no access to remove yet.
  expect(invited.getAllByRole('button')).toHaveLength(1);

  const cancel = invited.getByRole('button', { name: cancelButton('Fanni Aalto') });
  fireEvent.click(cancel);
  expect(confirm).toHaveBeenCalledWith('Perutaanko käyttäjän Fanni Aalto kutsu?');
  expect(companyInvitationsApi.cancel).not.toHaveBeenCalled();

  confirm.mockReturnValue(true);
  jest.mocked(companyInvitationsApi.list).mockResolvedValue([]);
  fireEvent.click(cancel);
  await waitFor(() => expect(companyInvitationsApi.cancel).toHaveBeenCalledWith('inv'));
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Odottavat kutsut' })).not.toBeInTheDocument(),
  );
  expect(screen.getByText('Anna Virtanen')).toBeInTheDocument();
});

test('shows the pending invitations to the others without a way to cancel them', async () => {
  mockAuth(ACCOUNTANT);
  jest.mocked(companyInvitationsApi.list).mockResolvedValue([{ ...INVITATION, isAdmin: true }]);
  render(<UsersSettings />);

  expect(await screen.findByRole('heading', { name: 'Odottavat kutsut' })).toBeInTheDocument();
  const invited = rowOf('Fanni Aalto');
  expect(invited.getByText('Ylläpitäjä')).toBeInTheDocument();
  expect(invited.queryByRole('button')).not.toBeInTheDocument();
});

test('shows why adding a user was refused, keeping the form open', async () => {
  mockAuth(OWNER);
  jest
    .mocked(companyUsersApi.create)
    .mockRejectedValue(new Error('That user is already a member of this company'));
  render(<UsersSettings />);
  await screen.findByText('Anna Virtanen');

  fireEvent.click(screen.getByRole('button', { name: 'Lisää käyttäjä' }));
  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(/^Sähköposti/), { target: { value: 'bertta@esimerkki.fi' } });
  fireEvent.change(dialog.getByLabelText(/^Etunimi/), { target: { value: 'Bertta' } });
  fireEvent.change(dialog.getByLabelText(/^Sukunimi/), { target: { value: 'Koski' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Lisää käyttäjä' }));

  expect(await dialog.findByRole('alert')).toHaveTextContent('already a member');
  expect(dialog.getByLabelText(/^Sähköposti/)).toHaveValue('bertta@esimerkki.fi');
});

test('lets a company administrator give any role and the administrator flag, sending only what changed', async () => {
  mockAuth(OWNER);
  render(<UsersSettings />);
  await screen.findByText('Cecilia Laine');

  fireEvent.click(screen.getByRole('button', { name: editButton('Cecilia Laine') }));
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByText('Cecilia Laine')).toBeInTheDocument();
  const save = dialog.getByRole('button', { name: 'Tallenna' });
  expect(save).toBeDisabled();

  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Rooli' }));
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Katselija',
    'Reskontranhoitaja',
    'Kirjanpitäjä',
    'Ylläpitäjä',
  ]);
  fireEvent.click(within(screen.getByRole('listbox')).getByText('Ylläpitäjä'));
  expect(save).toBeEnabled();
  fireEvent.click(save);
  await waitFor(() => expect(companyUsersApi.update).toHaveBeenCalledWith('led', { role: 'ADMIN' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(companyUsersApi.list).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: editButton('Bertta Koski') }));
  const second = within(await screen.findByRole('dialog'));
  fireEvent.click(second.getByLabelText('Yrityksen ylläpitäjä'));
  fireEvent.click(second.getByRole('button', { name: 'Tallenna' }));
  await waitFor(() => expect(companyUsersApi.update).toHaveBeenCalledWith('acc', { isAdmin: true }));
});

test('offers an accountant only the members and roles below them', async () => {
  mockAuth(ACCOUNTANT);
  render(<UsersSettings />);
  await screen.findByText('Bertta Koski');

  expect(screen.getByText(/Voit muuttaa rooleja käyttäjiltä/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Lisää käyttäjä' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /pääsy$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Uusi salasana' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /väliaikainen salasana$/ })).not.toBeInTheDocument();

  // Not themselves, and not the company administrator with a lower role.
  expect(rowOf('Bertta Koski').queryByRole('button')).not.toBeInTheDocument();
  expect(rowOf('Anna Virtanen').queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: editButton('Daavid Niemi') })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: editButton('Cecilia Laine') }));
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.queryByLabelText('Yrityksen ylläpitäjä')).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Rooli' }));
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Katselija',
    'Reskontranhoitaja',
  ]);
  fireEvent.click(within(screen.getByRole('listbox')).getByText('Katselija'));
  fireEvent.click(dialog.getByRole('button', { name: 'Tallenna' }));
  await waitFor(() => expect(companyUsersApi.update).toHaveBeenCalledWith('led', { role: 'VIEWER' }));
});

test('is read-only below the ACCOUNTANT role', async () => {
  mockAuth(LEDGER);
  render(<UsersSettings />);

  expect(await screen.findByText('Anna Virtanen')).toBeInTheDocument();
  expect(screen.getByText(/Sinulla on lukuoikeus/)).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test("removes a user's access after confirming", async () => {
  mockAuth(OWNER);
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<UsersSettings />);
  await screen.findByText('Bertta Koski');

  const remove = screen.getByRole('button', { name: removeButton('Bertta Koski') });
  fireEvent.click(remove);
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Bertta Koski pääsy yritykseen Esimerkki Oy'));
  expect(companyUsersApi.remove).not.toHaveBeenCalled();

  confirm.mockReturnValue(true);
  jest.mocked(companyUsersApi.list).mockResolvedValue([OWNER, LEDGER, NEWCOMER]);
  fireEvent.click(remove);
  await waitFor(() => expect(companyUsersApi.remove).toHaveBeenCalledWith('acc'));
  await waitFor(() => expect(screen.queryByText('Bertta Koski')).not.toBeInTheDocument());
});

test('issues a new temporary password to a user who has not logged in yet', async () => {
  mockAuth(OWNER);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest
    .mocked(companyUsersApi.resetTemporaryPassword)
    .mockResolvedValue({ temporaryPassword: 'ABCD-EFGH-JKMN-PQRS' });
  render(<UsersSettings />);
  await screen.findByText('Daavid Niemi');

  fireEvent.click(screen.getByRole('button', { name: newPasswordButton('Daavid Niemi') }));
  await waitFor(() => expect(companyUsersApi.resetTemporaryPassword).toHaveBeenCalledWith('new'));
  const credentials = within(await screen.findByRole('dialog', { name: 'Väliaikainen salasana' }));
  expect(credentials.getByLabelText('Sähköposti')).toHaveValue('daavid@esimerkki.fi');
  expect(credentials.getByLabelText('Väliaikainen salasana')).toHaveValue('ABCD-EFGH-JKMN-PQRS');
});

test("shows the backend's error when an action is refused", async () => {
  mockAuth(OWNER);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.mocked(companyUsersApi.remove).mockRejectedValue(new Error('Ei onnistu'));
  render(<UsersSettings />);
  await screen.findByText('Bertta Koski');

  fireEvent.click(screen.getByRole('button', { name: removeButton('Bertta Koski') }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ei onnistu');
  expect(screen.getByText('Bertta Koski')).toBeInTheDocument();
});

test('reloads when the active company changes', async () => {
  mockAuth(OWNER);
  const { rerender } = render(<UsersSettings />);
  await screen.findByText('Bertta Koski');

  mockAuth(OWNER, 'company-b');
  jest.mocked(companyUsersApi.list).mockResolvedValue([OWNER, member('x', 'Toinen', 'Yritys', 'LEDGER')]);
  rerender(<UsersSettings />);

  expect(await screen.findByText('Toinen Yritys')).toBeInTheDocument();
  expect(screen.queryByText('Bertta Koski')).not.toBeInTheDocument();
});
