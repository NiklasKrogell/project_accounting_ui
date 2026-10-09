import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../../i18n';
import { companyInfoApi } from '../../../api/companyInfo';
import { useAuth } from '../../../auth/AuthContext';
import type { AuthContextValue } from '../../../types/auth';
import type { CompanyInfo } from '../../../types/settings';
import { CompanyInfoSettings } from './CompanyInfoSettings';

jest.mock('../../../api/companyInfo');
jest.mock('../../../auth/AuthContext');

const INFO: CompanyInfo = {
  name: 'Esimerkki Oy',
  businessId: '1234567-8',
  billingEmail: 'laskut@esimerkki.fi',
  billingAddress: 'Katu 1',
  billingCity: 'Helsinki',
  billingPostalCode: '00100',
  billingCountry: 'Suomi',
};

const refreshSession = jest.fn();

function mockAuth(companyId: string, isAdmin = true) {
  jest.mocked(useAuth).mockReturnValue({
    activeMembership: { companyId, companyName: companyId, role: 'VIEWER', isAdmin },
    refreshSession,
  } as unknown as AuthContextValue);
}

const nameField = () => screen.getByLabelText(/^Yrityksen nimi/);
const cityField = () => screen.getByLabelText(/^Kaupunki/);
const saveButton = () => screen.getByRole('button', { name: 'Tallenna' });

beforeEach(() => {
  refreshSession.mockReset().mockResolvedValue(undefined);
  jest.mocked(companyInfoApi.get).mockResolvedValue(INFO);
  jest.mocked(companyInfoApi.update).mockImplementation(async (patch) => ({ ...INFO, ...patch }));
});

test("shows the active company's details, with the business ID locked", async () => {
  mockAuth('company-a');
  render(<CompanyInfoSettings />);

  await waitFor(() => expect(nameField()).toHaveValue('Esimerkki Oy'));
  expect(screen.getByLabelText(/^Y-tunnus/)).toHaveValue('1234567-8');
  expect(screen.getByLabelText(/^Y-tunnus/)).toBeDisabled();
  expect(screen.getByText('Y-tunnusta ei voi muuttaa.')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Laskutussähköposti/)).toHaveValue('laskut@esimerkki.fi');
  expect(screen.getByLabelText(/^Laskutusosoite/)).toHaveValue('Katu 1');
  expect(screen.getByLabelText(/^Postinumero/)).toHaveValue('00100');
  expect(cityField()).toHaveValue('Helsinki');
  expect(screen.getByLabelText(/^Maa/)).toHaveValue('Suomi');
  expect(nameField()).toBeEnabled();
  expect(saveButton()).toBeDisabled();
});

test('saves only the fields that changed', async () => {
  mockAuth('company-a');
  render(<CompanyInfoSettings />);
  await waitFor(() => expect(cityField()).toHaveValue('Helsinki'));

  fireEvent.change(cityField(), { target: { value: ' Espoo ' } });
  fireEvent.change(screen.getByLabelText(/^Postinumero/), { target: { value: '02100' } });
  expect(companyInfoApi.update).not.toHaveBeenCalled();

  fireEvent.click(saveButton());
  expect(await screen.findByRole('status')).toHaveTextContent('Tallennettu');
  expect(companyInfoApi.update).toHaveBeenCalledWith({
    billingCity: 'Espoo',
    billingPostalCode: '02100',
  });
  expect(cityField()).toHaveValue('Espoo');
  expect(saveButton()).toBeDisabled();
  // The name did not change, so the session is left alone.
  expect(refreshSession).not.toHaveBeenCalled();
});

test('refreshes the session after the name changed', async () => {
  mockAuth('company-a');
  render(<CompanyInfoSettings />);
  await waitFor(() => expect(nameField()).toHaveValue('Esimerkki Oy'));

  fireEvent.change(nameField(), { target: { value: 'Uusi Nimi Oy' } });
  fireEvent.click(saveButton());
  expect(await screen.findByRole('status')).toHaveTextContent('Tallennettu');
  expect(companyInfoApi.update).toHaveBeenCalledWith({ name: 'Uusi Nimi Oy' });
  expect(refreshSession).toHaveBeenCalledTimes(1);
});

test('does not offer to save an emptied field or an unchanged form', async () => {
  mockAuth('company-a');
  render(<CompanyInfoSettings />);
  await waitFor(() => expect(nameField()).toHaveValue('Esimerkki Oy'));

  fireEvent.change(nameField(), { target: { value: '   ' } });
  expect(saveButton()).toBeDisabled();
  // Only whitespace differs from what is saved.
  fireEvent.change(nameField(), { target: { value: 'Esimerkki Oy ' } });
  expect(saveButton()).toBeDisabled();
  fireEvent.change(nameField(), { target: { value: 'Esimerkki Ab' } });
  expect(saveButton()).toBeEnabled();
});

test("shows the backend's error when the save is refused", async () => {
  mockAuth('company-a');
  jest.mocked(companyInfoApi.update).mockRejectedValue(new Error('Validation failed'));
  render(<CompanyInfoSettings />);
  await waitFor(() => expect(nameField()).toHaveValue('Esimerkki Oy'));

  fireEvent.change(nameField(), { target: { value: 'Uusi' } });
  fireEvent.click(saveButton());
  expect(await screen.findByRole('alert')).toHaveTextContent('Validation failed');
  expect(nameField()).toHaveValue('Uusi');
  expect(refreshSession).not.toHaveBeenCalled();
});

test('reloads when the active company changes', async () => {
  mockAuth('company-a');
  const { rerender } = render(<CompanyInfoSettings />);
  await waitFor(() => expect(nameField()).toHaveValue('Esimerkki Oy'));

  mockAuth('company-b');
  jest.mocked(companyInfoApi.get).mockResolvedValue({ ...INFO, name: 'Toinen Oy' });
  rerender(<CompanyInfoSettings />);

  await waitFor(() => expect(nameField()).toHaveValue('Toinen Oy'));
  expect(companyInfoApi.get).toHaveBeenCalledTimes(2);
});

test('is read-only for someone who is not a company administrator', async () => {
  mockAuth('company-a', false);
  render(<CompanyInfoSettings />);

  await waitFor(() => expect(nameField()).toHaveValue('Esimerkki Oy'));
  expect(nameField()).toBeDisabled();
  expect(cityField()).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Tallenna' })).not.toBeInTheDocument();
  expect(screen.getByText(/vaatii yrityksen ylläpitäjän oikeudet/)).toBeInTheDocument();
});
