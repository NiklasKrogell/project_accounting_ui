import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n, { changeLanguage } from '../i18n';
import { api } from '../api/client';
import type { MeResponse } from '../types/auth';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('../api/client');

const me = (language: 'fi' | 'en'): MeResponse => ({
  user: { id: 'u1', firstName: 'Anna', lastName: 'Virtanen' } as MeResponse['user'],
  settings: { language },
  invitations: [],
  memberships: [],
  activeCompanyId: null,
});

function Probe() {
  const { loading, user, settings, invitations, updateUserSettings } = useAuth();
  if (loading) return null;
  return (
    <>
      <span data-testid="state">{user ? `in:${settings?.language}` : 'out'}</span>
      <span data-testid="inbox">{invitations.length}</span>
      <button onClick={() => void updateUserSettings({ language: 'fi' })}>to-fi</button>
    </>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

afterEach(() => {
  changeLanguage('fi');
  localStorage.clear();
});

test("applies the user's saved language once the session is known", async () => {
  jest.mocked(api).mockResolvedValue(me('en'));
  renderProvider();

  expect(await screen.findByTestId('state')).toHaveTextContent('in:en');
  await waitFor(() => expect(i18n.language).toBe('en'));
  // Cached for the logged-out pages of this browser.
  expect(localStorage.getItem('lang')).toBe('en');
});

test('saves a settings change to the user and applies it', async () => {
  jest.mocked(api).mockImplementation(async (path: string) =>
    path === '/api/settings/user' ? { language: 'fi' } : me('en'),
  );
  renderProvider();
  await waitFor(() => expect(i18n.language).toBe('en'));

  fireEvent.click(screen.getByText('to-fi'));

  await waitFor(() => expect(i18n.language).toBe('fi'));
  expect(api).toHaveBeenCalledWith('/api/settings/user', {
    method: 'PATCH',
    body: { language: 'fi' },
  });
  expect(screen.getByTestId('state')).toHaveTextContent('in:fi');
});

test('re-reads the inbox when the tab is returned to, staying logged in if that fails', async () => {
  let inbox: () => Promise<unknown> = async () => [{ id: 'a' }];
  jest.mocked(api).mockImplementation(async (path: string) =>
    path === '/api/invitations' ? inbox() : me('fi'),
  );
  renderProvider();
  expect(await screen.findByTestId('inbox')).toHaveTextContent('0');

  fireEvent(document, new Event('visibilitychange'));
  await waitFor(() => expect(screen.getByTestId('inbox')).toHaveTextContent('1'));

  // Unlike a failed read of the session, which means being logged out.
  inbox = async () => {
    throw new Error('Failed to fetch');
  };
  fireEvent(document, new Event('visibilitychange'));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
  expect(screen.getByTestId('state')).toHaveTextContent('in:fi');
  expect(screen.getByTestId('inbox')).toHaveTextContent('1');
});

test('leaves the language alone while logged out', async () => {
  changeLanguage('en');
  jest.mocked(api).mockRejectedValue(new Error('Authentication required'));
  renderProvider();

  expect(await screen.findByTestId('state')).toHaveTextContent('out');
  expect(i18n.language).toBe('en');
});
