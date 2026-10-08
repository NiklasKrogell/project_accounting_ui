import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../../i18n';
import { accountsApi } from '../../../api/accounts';
import { chartOfAccountsApi } from '../../../api/chartOfAccounts';
import { useAuth } from '../../../auth/AuthContext';
import type { Account } from '../../../types/account';
import type { AuthContextValue, Role } from '../../../types/auth';
import { VatAccountsSettings } from './VatAccountsSettings';

jest.mock('../../../api/accounts');
jest.mock('../../../api/chartOfAccounts');
jest.mock('../../../auth/AuthContext');

const account = (id: string, number: string, name: string): Account => ({
  id,
  number,
  name,
  accountGroupId: null,
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
  expect(save).toBeDisabled();
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
  expect(receivableField()).toBeDisabled();
  expect(payableField()).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Tallenna' })).not.toBeInTheDocument();
  expect(screen.getByText(/ALV-tilien muuttaminen vaatii/)).toBeInTheDocument();
});
