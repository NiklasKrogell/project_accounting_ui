import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../i18n';
import { invitationsApi } from '../../api/invitations';
import { useAuth } from '../../auth/AuthContext';
import type { AuthContextValue } from '../../types/auth';
import type { Invitation } from '../../types/invitation';
import { InboxButton } from './InboxButton';

jest.mock('../../api/invitations');
jest.mock('../../auth/AuthContext');

const refreshSession = jest.fn();
const refreshInvitations = jest.fn();

const invitation = (id: string, companyName: string, extra: Partial<Invitation> = {}): Invitation => ({
  id,
  companyId: `company-${id}`,
  companyName,
  businessId: '1234567-8',
  role: 'ACCOUNTANT',
  isAdmin: false,
  invitedBy: 'Anna Virtanen',
  // Midday, so the date is the same in whatever time zone the tests run.
  createdAt: '2026-10-09T12:00:00.000Z',
  ...extra,
});

const FIRST = invitation('a', 'Esimerkki Oy');
const SECOND = invitation('b', 'Toinen Oy', { role: 'VIEWER', isAdmin: true, invitedBy: null });

function mockAuth(invitations: Invitation[]) {
  jest.mocked(useAuth).mockReturnValue({
    invitations,
    refreshSession,
    refreshInvitations,
  } as unknown as AuthContextValue);
}

const open = () => fireEvent.click(screen.getByRole('button', { name: /^Saapuneet/ }));
const panel = () => within(screen.getByRole('dialog', { name: 'Saapuneet' }));
const acceptButton = (company: string) =>
  panel().getByRole('button', { name: `Hyväksy kutsu yritykseen ${company}` });
const declineButton = (company: string) =>
  panel().getByRole('button', { name: `Hylkää kutsu yritykseen ${company}` });

beforeEach(() => {
  refreshSession.mockReset().mockResolvedValue(undefined);
  refreshInvitations.mockReset().mockResolvedValue(undefined);
  jest.mocked(invitationsApi.accept).mockReset().mockResolvedValue({ companyId: 'company-a' });
  jest.mocked(invitationsApi.decline).mockReset().mockResolvedValue(undefined);
});

test('shows how many invitations are waiting', () => {
  mockAuth([FIRST, SECOND]);
  render(<InboxButton />);

  const button = screen.getByRole('button', { name: 'Saapuneet (2)' });
  expect(within(button).getByText('2')).toBeInTheDocument();
  // Closed until asked for.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('is there with nothing in it too, and re-reads the inbox when opened', () => {
  mockAuth([]);
  render(<InboxButton />);
  expect(refreshInvitations).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Saapuneet' }));
  expect(panel().getByText('Ei viestejä.')).toBeInTheDocument();
  expect(refreshInvitations).toHaveBeenCalledTimes(1);
});

test('tells who is inviting and what is offered', () => {
  mockAuth([FIRST, SECOND]);
  render(<InboxButton />);
  open();

  expect(panel().getByRole('heading', { name: 'Kutsu yritykseen Esimerkki Oy' })).toBeInTheDocument();
  expect(panel().getAllByText('Y-tunnus 1234567-8')).toHaveLength(2);
  expect(panel().getByText('Sinut on kutsuttu tämän yrityksen käyttäjäksi. Rooli: Kirjanpitäjä.')).toBeInTheDocument();
  expect(panel().getByText(/^Kutsuja: Anna Virtanen · 0?9\.10\.2026$/)).toBeInTheDocument();

  expect(panel().getByRole('heading', { name: 'Kutsu yritykseen Toinen Oy' })).toBeInTheDocument();
  expect(
    panel().getByText('Sinut on kutsuttu tämän yrityksen käyttäjäksi ja ylläpitäjäksi. Rooli: Katselija.'),
  ).toBeInTheDocument();
});

test('accepts an invitation and re-reads the session, closing when nothing is left', async () => {
  mockAuth([FIRST]);
  render(<InboxButton />);
  open();
  fireEvent.click(acceptButton('Esimerkki Oy'));

  await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
  expect(invitationsApi.accept).toHaveBeenCalledWith('a');
  expect(invitationsApi.decline).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('declines an invitation and re-reads the inbox only, staying open for the rest', async () => {
  mockAuth([FIRST, SECOND]);
  render(<InboxButton />);
  open();
  fireEvent.click(declineButton('Toinen Oy'));

  // Once on opening, once after declining.
  await waitFor(() => expect(refreshInvitations).toHaveBeenCalledTimes(2));
  expect(invitationsApi.decline).toHaveBeenCalledWith('b');
  expect(invitationsApi.accept).not.toHaveBeenCalled();
  expect(refreshSession).not.toHaveBeenCalled();
  await waitFor(() => expect(declineButton('Toinen Oy')).toBeEnabled());
  expect(acceptButton('Esimerkki Oy')).toBeInTheDocument();
});

test("shows the backend's error and what is still in the inbox", async () => {
  jest.mocked(invitationsApi.accept).mockRejectedValue(new Error('Invitation not found'));
  mockAuth([FIRST]);
  render(<InboxButton />);
  open();
  fireEvent.click(acceptButton('Esimerkki Oy'));

  expect(await panel().findByRole('alert')).toHaveTextContent('Invitation not found');
  expect(refreshSession).not.toHaveBeenCalled();
  await waitFor(() => expect(refreshInvitations).toHaveBeenCalledTimes(2));
});
