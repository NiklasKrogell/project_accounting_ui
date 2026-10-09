import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../i18n';
import { companiesApi } from '../api/companies';
import { useAuth } from '../auth/AuthContext';
import type { AuthContextValue, Membership } from '../types/auth';
import type { Invitation } from '../types/invitation';
import NoCompany from './NoCompany';

jest.mock('../api/companies');
jest.mock('../auth/AuthContext');

const refreshSession = jest.fn();

const MEMBERSHIP: Membership = {
  companyId: 'company-a',
  companyName: 'Esimerkki Oy',
  role: 'VIEWER',
  isAdmin: false,
  subscriptionStatus: 'ACTIVE',
  subscriptionEndsAt: null,
};

function mockAuth(memberships: Membership[] = [], invitations: Invitation[] = []) {
  jest.mocked(useAuth).mockReturnValue({
    user: { email: 'anna@example.com' },
    memberships,
    invitations,
    refreshSession,
  } as unknown as AuthContextValue);
}

const invitation = (id: string): Invitation => ({
  id,
  companyId: `company-${id}`,
  companyName: 'Kutsuva Oy',
  businessId: '7654321-0',
  role: 'LEDGER',
  isAdmin: false,
  invitedBy: 'Bertta Koski',
  createdAt: '2026-10-09T12:00:00.000Z',
});

const registerButton = () => screen.getByRole('button', { name: 'Rekisteröi uusi yritys' });
const submit = () => screen.getByRole('button', { name: 'Rekisteröi yritys' });
const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillIn() {
  type(/^Yrityksen nimi/, '  Uusi Yritys Oy ');
  type(/^Y-tunnus/, '1234567-8');
  type(/^Laskutussähköposti/, 'laskut@example.com');
  type(/^Laskutusosoite/, 'Katu 1 A');
  type(/^Postinumero/, '00100');
  type(/^Kaupunki/, 'Helsinki');
}

beforeEach(() => {
  refreshSession.mockReset().mockResolvedValue(undefined);
  jest.mocked(companiesApi.create).mockReset().mockResolvedValue({
    id: 'company-new',
    name: 'Uusi Yritys Oy',
    subscriptionStatus: 'PENDING_PAYMENT',
  });
});

test('asks a user without a company whether to register one', () => {
  mockAuth();
  render(<NoCompany />);

  expect(screen.getByText('Et kuulu yhteenkään yritykseen.')).toBeInTheDocument();
  // The email a company's administrator would add them with.
  expect(screen.getByText(/anna@example\.com/)).toBeInTheDocument();
  expect(screen.getByText('Haluatko rekisteröidä uuden yrityksen?')).toBeInTheDocument();
  expect(registerButton()).toBeInTheDocument();
  // The company form is only shown once asked for.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('points a user who has been invited at the inbox', () => {
  mockAuth([], [invitation('a')]);
  const { rerender } = render(<NoCompany />);

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Sinulle on tullut kutsu yritykseen. Avaa saapuneet yläpalkista ja vastaa siihen.',
  );
  // In place of how to get invited; registering a company stays on offer.
  expect(screen.queryByText(/anna@example\.com/)).not.toBeInTheDocument();
  expect(registerButton()).toBeInTheDocument();

  mockAuth([], [invitation('a'), invitation('b')]);
  rerender(<NoCompany />);
  expect(screen.getByRole('alert')).toHaveTextContent('Sinulle on tullut 2 kutsua.');
});

test('registers the company and picks up the new session state', async () => {
  mockAuth();
  render(<NoCompany />);
  fireEvent.click(registerButton());
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  fillIn();
  // Every detail is required.
  expect(submit()).toBeDisabled();
  type(/^Maa/, 'Suomi');
  fireEvent.click(submit());

  await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
  expect(companiesApi.create).toHaveBeenCalledWith({
    name: 'Uusi Yritys Oy',
    businessId: '1234567-8',
    billingEmail: 'laskut@example.com',
    billingAddress: 'Katu 1 A',
    billingPostalCode: '00100',
    billingCity: 'Helsinki',
    billingCountry: 'Suomi',
  });
});

test("shows the backend's error and keeps the form open", async () => {
  jest
    .mocked(companiesApi.create)
    .mockRejectedValue(new Error('A company with that business ID already exists'));
  mockAuth();
  render(<NoCompany />);
  fireEvent.click(registerButton());
  fillIn();
  type(/^Maa/, 'Suomi');
  fireEvent.click(submit());

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A company with that business ID already exists',
  );
  expect(refreshSession).not.toHaveBeenCalled();
  expect(screen.getByLabelText(/^Y-tunnus/)).toHaveValue('1234567-8');
  expect(submit()).toBeEnabled();
});

test('points a member of companies with none selected at the company switcher', () => {
  mockAuth([MEMBERSHIP]);
  render(<NoCompany />);

  expect(screen.getByText(/Valitse yritys yläpalkista/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rekisteröi uusi yritys' })).not.toBeInTheDocument();
});
