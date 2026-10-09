import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../../i18n';
import { accountsApi } from '../../../api/accounts';
import { chartOfAccountsApi } from '../../../api/chartOfAccounts';
import { companySettingsApi } from '../../../api/companySettings';
import { useAuth } from '../../../auth/AuthContext';
import type { Account } from '../../../types/account';
import type { AuthContextValue, Role } from '../../../types/auth';
import { VatAccountsSettings } from './VatAccountsSettings';

jest.mock('../../../api/accounts');
jest.mock('../../../api/chartOfAccounts');
jest.mock('../../../api/companySettings');
jest.mock('../../../auth/AuthContext');

const account = (id: string, number: string, name: string): Account => ({
  id,
  number,
  name,
  accountGroupId: null,
  defaultVatRate: null,
  createdAt: '',
  updatedAt: '',
});

const ACCOUNTS = [
  account('receivable', '1763', 'Arvonlisäverosaaminen'),
  account('payable', '2939', 'Arvonlisäverovelka'),
  account('other', '2940', 'Muu verovelka'),
];

function mockAuth(companyId: string, role: Role = 'LEDGER') {
  jest.mocked(useAuth).mockReturnValue({
    activeMembership: { companyId, companyName: companyId, role },
  } as unknown as AuthContextValue);
}

const receivableField = () => screen.getByLabelText('Alv-saamisten tili');
const payableField = () => screen.getByLabelText('Alv-velan tili');
const registeredSwitch = () => screen.getByLabelText('Yritys on arvonlisäverovelvollinen');

// The company is VAT-registered unless a test says otherwise.
beforeEach(() => {
  jest.mocked(companySettingsApi.get).mockResolvedValue({ vatRegistered: true });
  jest.mocked(companySettingsApi.update).mockImplementation(async (patch) => ({
    vatRegistered: true,
    ...patch,
  }));
});

test("shows the active company's VAT accounts and saves a change", async () => {
  mockAuth('company-a');
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: 'payable',
  });
  jest.mocked(chartOfAccountsApi.setVatAccounts).mockImplementation(async (input) => input);
  render(<VatAccountsSettings />);

  await waitFor(() => expect(receivableField()).toHaveValue('1763 Arvonlisäverosaaminen'));
  expect(payableField()).toHaveValue('2939 Arvonlisäverovelka');
  const save = screen.getByRole('button', { name: 'Tallenna' });
  expect(save).toBeDisabled();

  fireEvent.mouseDown(payableField());
  fireEvent.click(await screen.findByRole('option', { name: /^2940 / }));
  expect(chartOfAccountsApi.setVatAccounts).not.toHaveBeenCalled();

  fireEvent.click(save);
  expect(await screen.findByRole('status')).toHaveTextContent('Tallennettu');
  expect(chartOfAccountsApi.setVatAccounts).toHaveBeenCalledWith({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: 'other',
  });
  // Only the part that changed is saved.
  expect(companySettingsApi.update).not.toHaveBeenCalled();
  expect(save).toBeDisabled();
});

test('greys out the VAT accounts of a company that is not VAT-registered', async () => {
  mockAuth('company-a', 'ACCOUNTANT');
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: 'payable',
  });
  render(<VatAccountsSettings />);

  await waitFor(() => expect(receivableField()).toHaveValue('1763 Arvonlisäverosaaminen'));
  expect(registeredSwitch()).toBeChecked();
  expect(receivableField()).toBeEnabled();
  const save = screen.getByRole('button', { name: 'Tallenna' });

  fireEvent.click(registeredSwitch());
  expect(receivableField()).toBeDisabled();
  expect(payableField()).toBeDisabled();
  // The accounts are kept for when the company registers again.
  expect(payableField()).toHaveValue('2939 Arvonlisäverovelka');
  expect(screen.getByText(/ei ole arvonlisäverovelvollinen/)).toBeInTheDocument();
  expect(companySettingsApi.update).not.toHaveBeenCalled();

  fireEvent.click(save);
  expect(await screen.findByRole('status')).toHaveTextContent('Tallennettu');
  expect(companySettingsApi.update).toHaveBeenCalledWith({ vatRegistered: false });
  expect(chartOfAccountsApi.setVatAccounts).not.toHaveBeenCalled();
  expect(save).toBeDisabled();
});

test('shows a company saved as not VAT-registered with its accounts greyed out', async () => {
  mockAuth('company-a', 'ACCOUNTANT');
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: 'payable',
  });
  jest.mocked(companySettingsApi.get).mockResolvedValue({ vatRegistered: false });
  render(<VatAccountsSettings />);

  await waitFor(() => expect(receivableField()).toHaveValue('1763 Arvonlisäverosaaminen'));
  expect(registeredSwitch()).not.toBeChecked();
  expect(receivableField()).toBeDisabled();

  fireEvent.click(registeredSwitch());
  expect(receivableField()).toBeEnabled();
  expect(payableField()).toBeEnabled();
});

test('lets the LEDGER role change the accounts but not the registration', async () => {
  mockAuth('company-a', 'LEDGER');
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: 'payable',
  });
  render(<VatAccountsSettings />);

  await waitFor(() => expect(receivableField()).toHaveValue('1763 Arvonlisäverosaaminen'));
  expect(registeredSwitch()).toBeDisabled();
  expect(screen.getByText(/vaatii kirjanpitäjän oikeudet/)).toBeInTheDocument();
  expect(receivableField()).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Tallenna' })).toBeInTheDocument();
});

test('reloads when the active company changes', async () => {
  mockAuth('company-a');
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: null,
  });
  const { rerender } = render(<VatAccountsSettings />);
  await waitFor(() => expect(receivableField()).toHaveValue('1763 Arvonlisäverosaaminen'));

  mockAuth('company-b');
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: null,
    vatPayableAccountId: 'other',
  });
  rerender(<VatAccountsSettings />);

  await waitFor(() => expect(payableField()).toHaveValue('2940 Muu verovelka'));
  expect(receivableField()).toHaveValue('');
  expect(chartOfAccountsApi.getVatAccounts).toHaveBeenCalledTimes(2);
});

test('is read-only below the LEDGER role', async () => {
  mockAuth('company-a', 'VIEWER');
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: 'receivable',
    vatPayableAccountId: 'payable',
  });
  render(<VatAccountsSettings />);

  await waitFor(() => expect(receivableField()).toHaveValue('1763 Arvonlisäverosaaminen'));
  expect(registeredSwitch()).toBeDisabled();
  expect(receivableField()).toBeDisabled();
  expect(payableField()).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Tallenna' })).not.toBeInTheDocument();
  expect(screen.getByText(/ALV-tilien muuttaminen vaatii/)).toBeInTheDocument();
});
