import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../i18n';
import { accountsApi } from '../../api/accounts';
import { chartOfAccountsApi } from '../../api/chartOfAccounts';
import { costCentersApi } from '../../api/costCenters';
import { journalEntriesApi } from '../../api/journalEntries';
import type { Account, VatAccounts } from '../../types/account';
import JournalEntryDialog from './JournalEntryDialog';

jest.mock('../../api/accounts');
jest.mock('../../api/chartOfAccounts');
jest.mock('../../api/costCenters');
jest.mock('../../api/journalEntries');

const account = (id: string, number: string, name: string): Account => ({
  id,
  number,
  name,
  accountGroupId: null,
  createdAt: '',
  updatedAt: '',
});

const ACCOUNTS = [
  account('receivables', '1700', 'Myyntisaamiset'),
  account('vat-receivable', '1763', 'Arvonlisäverosaaminen'),
  account('vat-payable', '2939', 'Arvonlisäverovelka'),
  account('sales', '3000', 'Myynti'),
];

function mockApis(vatAccounts: VatAccounts) {
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(costCentersApi.list).mockResolvedValue([]);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue(vatAccounts);
  jest.mocked(journalEntriesApi.create).mockResolvedValue({} as never);
}

// The line grid has no per-row labels, so fields are found by position: each
// line contributes an account, a VAT rate and a cost center combobox, after
// the voucher type select at the top.
const lineCombobox = (line: number, field: 'account' | 'vatRate') =>
  screen.getAllByRole('combobox')[1 + line * 3 + (field === 'account' ? 0 : 1)];

async function pickAccount(line: number, number: string) {
  const input = lineCombobox(line, 'account');
  fireEvent.change(input, { target: { value: number } });
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(`^${number} `) }));
}

function pickVatRate(line: number, label: string) {
  fireEvent.mouseDown(lineCombobox(line, 'vatRate'));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(label));
}

function typeAmount(line: number, amount: string) {
  fireEvent.change(screen.getAllByPlaceholderText('+100,00')[line], { target: { value: amount } });
}

async function fillSale() {
  render(<JournalEntryDialog open onClose={() => {}} />);
  await waitFor(() => expect(chartOfAccountsApi.getVatAccounts).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Myyntilasku' } });
  await pickAccount(0, '1700');
  typeAmount(0, '+125,5');
  await pickAccount(1, '3000');
  typeAmount(1, '-100');
  pickVatRate(1, '25,5 %');
}

const submitButton = () => screen.getByRole('button', { name: 'Tallenna kirjaus' });

describe('JournalEntryDialog', () => {
  it('saves a net-priced sale whose VAT row balances the entry', async () => {
    mockApis({ vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: 'vat-payable' });
    await fillSale();

    // The VAT row is previewed on the payable account, and counted in the totals.
    expect(await screen.findByText('2939 Arvonlisäverovelka')).toBeInTheDocument();
    expect(screen.getByText(/Täsmää/)).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();

    fireEvent.click(submitButton());
    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    expect(jest.mocked(journalEntriesApi.create).mock.calls[0][0].lines).toEqual([
      expect.objectContaining({ accountId: 'receivables', amount: 125.5, type: 'debit', vatRate: 0 }),
      expect.objectContaining({ accountId: 'sales', amount: 100, type: 'credit', vatRate: 25.5 }),
    ]);
  });

  it('does not balance when the VAT is left out of the counter line', async () => {
    mockApis({ vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: 'vat-payable' });
    await fillSale();
    typeAmount(0, '+100');
    expect(screen.getByText(/Erotus/)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it('blocks saving a line with VAT when its VAT account is not set', async () => {
    mockApis({ vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: null });
    await fillSale();
    expect(await screen.findByRole('alert')).toHaveTextContent(/ALV-tiliä ei ole asetettu/);
    expect(submitButton()).toBeDisabled();
  });
});
