import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../../i18n';
import { accountsApi } from '../../../api/accounts';
import { bankAccountsApi } from '../../../api/bankAccounts';
import { useAuth } from '../../../auth/AuthContext';
import type { Account, BalanceSheetItem } from '../../../types/account';
import type { AuthContextValue, Role } from '../../../types/auth';
import type { BankAccount } from '../../../types/bankAccount';
import { BankSettings } from './BankSettings';

jest.mock('../../../api/accounts');
jest.mock('../../../api/bankAccounts');
jest.mock('../../../auth/AuthContext');

// An account of the balance sheet item "Rahat ja pankkisaamiset", unless told
// otherwise.
const account = (
  id: string,
  number: string,
  name: string,
  balanceSheetItem: BalanceSheetItem | null = 'CASH_AND_BANK',
): Account => ({
  id,
  number,
  name,
  accountGroupId: 'group',
  accountGroup: {
    id: 'group',
    name: 'Ryhmä',
    mainClass: 'CURRENT_ASSETS',
    incomeStatementSubItem: null,
    balanceSheetItem,
  },
  defaultVatRate: null,
  createdAt: '',
  updatedAt: '',
});

const RECEIVABLES = account('acc-1700', '1700', 'Myyntisaamiset', 'SHORT_TERM_TRADE_RECEIVABLES');
const ACCOUNTS = [
  RECEIVABLES,
  account('acc-1910', '1910', 'Pankkitili'),
  account('acc-1920', '1920', 'Säästötili'),
  { ...account('acc-9999', '9999', 'Ryhmätön tili'), accountGroupId: null, accountGroup: null },
];
const BANK = ACCOUNTS[1];
const SAVINGS = ACCOUNTS[2];

const bankAccount = (
  id: string,
  name: string,
  iban: string,
  isActive = true,
  linked = BANK,
): BankAccount => ({
  id,
  name,
  iban,
  accountId: linked.id,
  isActive,
  account: { id: linked.id, number: linked.number, name: linked.name },
  createdAt: '',
  updatedAt: '',
});

const MAIN = bankAccount('main', 'Käyttötili', 'FI2112345600000785');
const OLD = bankAccount('old', 'Vanha tili', 'DE89370400440532013000', false, SAVINGS);

function mockAuth(companyId: string, role: Role = 'LEDGER') {
  jest.mocked(useAuth).mockReturnValue({
    activeMembership: { companyId, companyName: companyId, role },
  } as unknown as AuthContextValue);
}

const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(`^${name}`) });

beforeEach(() => {
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(bankAccountsApi.list).mockResolvedValue([MAIN, OLD]);
  jest.mocked(bankAccountsApi.create).mockResolvedValue(MAIN);
  jest.mocked(bankAccountsApi.update).mockResolvedValue(MAIN);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("lists the active company's bank accounts and marks the ones out of use", async () => {
  mockAuth('company-a');
  render(<BankSettings />);

  expect(await screen.findByText('Käyttötili')).toBeInTheDocument();
  const main = within(rowOf('Käyttötili'));
  expect(main.getByText('FI21 1234 5600 0007 85')).toBeInTheDocument();
  expect(main.getByText('1910 Pankkitili')).toBeInTheDocument();
  expect(main.queryByText('Ei käytössä')).not.toBeInTheDocument();
  expect(main.getByRole('button', { name: 'Poista pankkitili Käyttötili käytöstä' })).toBeInTheDocument();

  const old = within(rowOf('Vanha tili'));
  expect(old.getByText('Ei käytössä')).toBeInTheDocument();
  expect(old.getByText('1920 Säästötili')).toBeInTheDocument();
  expect(old.getByRole('button', { name: 'Ota pankkitili Vanha tili käyttöön' })).toBeInTheDocument();
});

test('adds a bank account, refusing an invalid IBAN', async () => {
  mockAuth('company-a');
  jest.mocked(bankAccountsApi.list).mockResolvedValue([]);
  render(<BankSettings />);
  expect(await screen.findByText('Ei pankkitilejä vielä.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Lisää pankkitili' }));
  const dialog = within(await screen.findByRole('dialog'));
  const save = dialog.getByRole('button', { name: 'Tallenna' });
  expect(save).toBeDisabled();

  fireEvent.change(dialog.getByLabelText(/^Nimi/), { target: { value: ' Käyttötili ' } });
  const iban = dialog.getByLabelText(/^IBAN/);
  // Right shape, wrong checksum.
  fireEvent.change(iban, { target: { value: 'FI22 1234 5600 0007 85' } });
  fireEvent.mouseDown(dialog.getByLabelText(/^Kirjanpitotili/));
  fireEvent.click(await screen.findByRole('option', { name: /^1910 / }));
  expect(save).toBeDisabled();
  expect(dialog.queryByText('IBAN-tilinumero ei ole kelvollinen.')).not.toBeInTheDocument();
  fireEvent.blur(iban);
  expect(dialog.getByText('IBAN-tilinumero ei ole kelvollinen.')).toBeInTheDocument();

  fireEvent.change(iban, { target: { value: 'fi21 1234 5600 0007 85' } });
  expect(dialog.queryByText('IBAN-tilinumero ei ole kelvollinen.')).not.toBeInTheDocument();
  expect(save).toBeEnabled();

  jest.mocked(bankAccountsApi.list).mockResolvedValue([MAIN]);
  fireEvent.click(save);
  await waitFor(() =>
    expect(bankAccountsApi.create).toHaveBeenCalledWith({
      name: 'Käyttötili',
      iban: 'FI2112345600000785',
      accountId: 'acc-1910',
    }),
  );
  // The list is reloaded and the dialog closed.
  expect(await screen.findByText('FI21 1234 5600 0007 85')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('offers only the accounts under "Rahat ja pankkisaamiset", plus the one already linked', async () => {
  mockAuth('company-a');
  const legacy = bankAccount('legacy', 'Erikoistili', 'NL91ABNA0417164300', true, RECEIVABLES);
  jest.mocked(bankAccountsApi.list).mockResolvedValue([MAIN, legacy]);
  render(<BankSettings />);
  await screen.findByText('Käyttötili');
  const optionNames = () => screen.getAllByRole('option').map((option) => option.textContent);

  fireEvent.click(screen.getByRole('button', { name: 'Lisää pankkitili' }));
  fireEvent.mouseDown(within(await screen.findByRole('dialog')).getByLabelText(/^Kirjanpitotili/));
  await screen.findByRole('option', { name: /^1910 / });
  expect(optionNames()).toEqual(['1910 Pankkitili', '1920 Säästötili']);
  fireEvent.click(screen.getByRole('button', { name: 'Peruuta' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: 'Muokkaa pankkitiliä Erikoistili' }));
  const account = within(await screen.findByRole('dialog')).getByLabelText(/^Kirjanpitotili/);
  expect(account).toHaveValue('1700 Myyntisaamiset');
  fireEvent.mouseDown(account);
  await screen.findByRole('option', { name: /^1910 / });
  expect(optionNames()).toEqual(['1700 Myyntisaamiset', '1910 Pankkitili', '1920 Säästötili']);
});

test('edits a bank account without touching whether it is in use', async () => {
  mockAuth('company-a');
  render(<BankSettings />);
  await screen.findByText('Vanha tili');

  fireEvent.click(screen.getByRole('button', { name: 'Muokkaa pankkitiliä Vanha tili' }));
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByLabelText(/^Nimi/)).toHaveValue('Vanha tili');
  expect(dialog.getByLabelText(/^IBAN/)).toHaveValue('DE89 3704 0044 0532 0130 00');
  expect(dialog.getByLabelText(/^Kirjanpitotili/)).toHaveValue('1920 Säästötili');

  fireEvent.change(dialog.getByLabelText(/^Nimi/), { target: { value: 'Entinen tili' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Tallenna' }));
  await waitFor(() =>
    expect(bankAccountsApi.update).toHaveBeenCalledWith('old', {
      name: 'Entinen tili',
      iban: 'DE89370400440532013000',
      accountId: 'acc-1920',
    }),
  );
});

test('takes a bank account out of use after confirming, and back into use', async () => {
  mockAuth('company-a');
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<BankSettings />);
  await screen.findByText('Käyttötili');

  const deactivate = screen.getByRole('button', { name: 'Poista pankkitili Käyttötili käytöstä' });
  fireEvent.click(deactivate);
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(bankAccountsApi.update).not.toHaveBeenCalled();

  confirm.mockReturnValue(true);
  fireEvent.click(deactivate);
  await waitFor(() =>
    expect(bankAccountsApi.update).toHaveBeenCalledWith('main', {
      name: 'Käyttötili',
      iban: 'FI2112345600000785',
      accountId: 'acc-1910',
      isActive: false,
    }),
  );
  await waitFor(() => expect(bankAccountsApi.list).toHaveBeenCalledTimes(2));

  // Taking one back into use needs no confirmation.
  fireEvent.click(screen.getByRole('button', { name: 'Ota pankkitili Vanha tili käyttöön' }));
  await waitFor(() =>
    expect(bankAccountsApi.update).toHaveBeenCalledWith('old', {
      name: 'Vanha tili',
      iban: 'DE89370400440532013000',
      accountId: 'acc-1920',
      isActive: true,
    }),
  );
  expect(confirm).toHaveBeenCalledTimes(2);
});

test("shows the backend's error when a save is refused", async () => {
  mockAuth('company-a');
  jest.mocked(bankAccountsApi.update).mockRejectedValue(new Error('Ei onnistu'));
  render(<BankSettings />);
  await screen.findByText('Vanha tili');

  fireEvent.click(screen.getByRole('button', { name: 'Ota pankkitili Vanha tili käyttöön' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ei onnistu');
});

test('reloads when the active company changes', async () => {
  mockAuth('company-a');
  const { rerender } = render(<BankSettings />);
  await screen.findByText('Käyttötili');

  mockAuth('company-b');
  jest
    .mocked(bankAccountsApi.list)
    .mockResolvedValue([bankAccount('other', 'Toisen yrityksen tili', 'NL91ABNA0417164300')]);
  rerender(<BankSettings />);

  expect(await screen.findByText('Toisen yrityksen tili')).toBeInTheDocument();
  expect(screen.queryByText('Käyttötili')).not.toBeInTheDocument();
});

test('is read-only below the LEDGER role', async () => {
  mockAuth('company-a', 'VIEWER');
  render(<BankSettings />);

  expect(await screen.findByText('Käyttötili')).toBeInTheDocument();
  expect(screen.getByText(/Pankkitilien hallinta vaatii/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Lisää pankkitili' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Muokkaa pankkitiliä/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /käytöstä/ })).not.toBeInTheDocument();
  expect(accountsApi.list).not.toHaveBeenCalled();
});
