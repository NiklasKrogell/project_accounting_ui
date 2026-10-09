import { fireEvent, render, screen, within } from '@testing-library/react';
import '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import type { AuthContextValue, Membership } from '../../types/auth';
import { CustomAppBar } from './CustomAppBar';

jest.mock('../../api/companies');
jest.mock('../../api/invitations');
jest.mock('../../auth/AuthContext');

const switchCompany = jest.fn();

const membership = (companyId: string, companyName: string, paid = true): Membership => ({
  companyId,
  companyName,
  role: 'VIEWER',
  isAdmin: false,
  subscriptionStatus: paid ? 'ACTIVE' : 'PENDING_PAYMENT',
  subscriptionEndsAt: null,
});

function mockAuth(memberships: Membership[], activeCompanyId: string | null = memberships[0]?.companyId ?? null) {
  jest.mocked(useAuth).mockReturnValue({
    user: { firstName: 'Anna', lastName: 'Virtanen' },
    memberships,
    invitations: [],
    activeCompanyId,
    switchCompany,
    logout: jest.fn(),
    refreshSession: jest.fn(),
    refreshInvitations: jest.fn(),
  } as unknown as AuthContextValue);
}

const openSwitcher = () => fireEvent.mouseDown(screen.getByRole('combobox'));
const options = () => screen.getAllByRole('option').map((option) => option.textContent);

beforeEach(() => {
  switchCompany.mockReset().mockResolvedValue(undefined);
});

test('lists the companies, with registering a new one as the last entry', () => {
  mockAuth([membership('a', 'Esimerkki Oy'), membership('b', 'Toinen Oy', false)]);
  render(<CustomAppBar />);
  openSwitcher();

  expect(options()).toEqual(['Esimerkki Oy', 'Toinen Oy (ei-aktiivinen)', 'Rekisteröi uusi yritys']);
});

test('switches to the company picked', () => {
  mockAuth([membership('a', 'Esimerkki Oy'), membership('b', 'Toinen Oy')]);
  render(<CustomAppBar />);
  openSwitcher();
  fireEvent.click(screen.getByRole('option', { name: 'Toinen Oy' }));

  expect(switchCompany).toHaveBeenCalledWith('b');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('opens the company registration instead of switching for the last entry', async () => {
  mockAuth([membership('a', 'Esimerkki Oy')]);
  render(<CustomAppBar />);
  openSwitcher();
  fireEvent.click(screen.getByRole('option', { name: 'Rekisteröi uusi yritys' }));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: 'Rekisteröi uusi yritys' })).toBeInTheDocument();
  expect(within(dialog).getByLabelText(/^Y-tunnus/)).toBeInTheDocument();
  expect(switchCompany).not.toHaveBeenCalled();
  // The switcher still shows the company the user is working in.
  expect(screen.getByRole('combobox', { hidden: true })).toHaveTextContent('Esimerkki Oy');
});

test('has no switcher for a user without a company, but the inbox all the same', () => {
  mockAuth([]);
  render(<CustomAppBar />);

  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Saapuneet' })).toBeInTheDocument();
});
