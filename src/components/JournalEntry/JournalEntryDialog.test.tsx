import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../i18n';
import { accountsApi } from '../../api/accounts';
import { chartOfAccountsApi } from '../../api/chartOfAccounts';
import { companySettingsApi } from '../../api/companySettings';
import { costCentersApi } from '../../api/costCenters';
import { journalEntriesApi } from '../../api/journalEntries';
import type { Account, VatAccounts } from '../../types/account';
import JournalEntryDialog from './JournalEntryDialog';

jest.mock('../../api/accounts');
jest.mock('../../api/chartOfAccounts');
jest.mock('../../api/companySettings');
jest.mock('../../api/costCenters');
jest.mock('../../api/journalEntries');

// Driving the form in jsdom is slow (MUI Autocompletes), and the suites run in
// parallel: on a loaded machine a test can outlast the default 5 s.
jest.setTimeout(20000);

const account = (
  id: string,
  number: string,
  name: string,
  defaultVatRate: number | null = null,
): Account => ({
  id,
  number,
  name,
  accountGroupId: null,
  defaultVatRate,
  createdAt: '',
  updatedAt: '',
});

// Only 3020 has a default VAT rate.
const ACCOUNTS = [
  account('receivables', '1700', 'Myyntisaamiset'),
  account('vat-receivable', '1763', 'Arvonlisäverosaaminen'),
  account('vat-payable', '2939', 'Arvonlisäverovelka'),
  account('sales', '3000', 'Myynti'),
  account('sales-10', '3020', 'Myynti 10 %', 10),
];

function mockApis(vatAccounts: VatAccounts, vatRegistered = true) {
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(costCentersApi.list).mockResolvedValue([]);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue(vatAccounts);
  jest.mocked(companySettingsApi.get).mockResolvedValue({ vatRegistered });
  jest.mocked(journalEntriesApi.create).mockResolvedValue({} as never);
}

// The line grid has no per-row labels, so fields are found by position: each
// line contributes an account, a VAT rate and a cost center combobox, after
// the voucher type select at the top.
const lineCombobox = (line: number, field: 'account' | 'vatRate') =>
  screen.getAllByRole('combobox')[1 + line * 3 + (field === 'account' ? 0 : 1)];

async function pickAccount(line: number, number: string) {
  const input = lineCombobox(line, 'account');
  // Typed into without focus, the Autocomplete puts the text of the account
  // it already holds back, and a line's account couldn't be changed.
  act(() => input.focus());
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
    const input = jest.mocked(journalEntriesApi.create).mock.calls[0][0];
    expect(input.vatBasis).toBe('net');
    expect(input.automaticVat).toBe(true);
    expect(input.lines).toEqual([
      expect.objectContaining({ accountId: 'receivables', amount: 125.5, type: 'debit', vatRate: 0 }),
      expect.objectContaining({ accountId: 'sales', amount: 100, type: 'credit', vatRate: 25.5 }),
    ]);
  });

  it('saves a gross-priced sale, whose amounts balance as entered', async () => {
    mockApis({ vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: 'vat-payable' });
    await fillSale();
    fireEvent.click(screen.getByRole('button', { name: 'Brutto' }));

    // Read as gross, 125,50 against 100,00 no longer balances.
    expect(screen.getByText('Verollinen summa')).toBeInTheDocument();
    expect(screen.getByText(/Erotus/)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    typeAmount(1, '-125,5');
    expect(screen.getByText(/Täsmää/)).toBeInTheDocument();
    // The VAT row is still previewed: it is taken out of the sales line.
    expect(screen.getByText('2939 Arvonlisäverovelka')).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    const input = jest.mocked(journalEntriesApi.create).mock.calls[0][0];
    expect(input.vatBasis).toBe('gross');
    expect(input.lines).toEqual([
      expect.objectContaining({ accountId: 'receivables', amount: 125.5, type: 'debit', vatRate: 0 }),
      expect.objectContaining({ accountId: 'sales', amount: 125.5, type: 'credit', vatRate: 25.5 }),
    ]);
  });

  it('generates no VAT rows with automatic VAT off: the lines balance as entered', async () => {
    // No VAT accounts are needed when the VAT is booked by hand.
    mockApis({ vatReceivableAccountId: null, vatPayableAccountId: null });
    await fillSale();
    fireEvent.click(screen.getByLabelText('Automaattinen ALV'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/ALV-rivit, jotka/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brutto' })).toBeDisabled();
    // 125,50 against 100,00: the VAT has to be entered as a line of its own.
    expect(screen.getByText(/Erotus/)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Lisää rivi' }));
    await pickAccount(2, '2939');
    typeAmount(2, '-25,5');
    expect(screen.getByText(/Täsmää/)).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    const input = jest.mocked(journalEntriesApi.create).mock.calls[0][0];
    expect(input.automaticVat).toBe(false);
    expect(input.lines).toEqual([
      expect.objectContaining({ accountId: 'receivables', amount: 125.5, type: 'debit', vatRate: 0 }),
      expect.objectContaining({ accountId: 'sales', amount: 100, type: 'credit', vatRate: 25.5 }),
      expect.objectContaining({ accountId: 'vat-payable', amount: 25.5, type: 'credit', vatRate: 0 }),
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

  it('takes no VAT when the company is not VAT-registered', async () => {
    mockApis({ vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: 'vat-payable' }, false);
    render(<JournalEntryDialog open onClose={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/ei ole arvonlisäverovelvollinen/);
    expect(lineCombobox(0, 'vatRate')).toHaveAttribute('aria-disabled', 'true');
    expect(lineCombobox(1, 'vatRate')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Automaattinen ALV')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Brutto' })).toBeDisabled();
    // The amounts are neither net nor gross, and there is no VAT to sum up.
    expect(screen.getByText('Summa')).toBeInTheDocument();
    expect(screen.queryByText(/Alv-velka/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Myyntilasku' } });
    await pickAccount(0, '1700');
    typeAmount(0, '+100');
    await pickAccount(1, '3000');
    typeAmount(1, '-100');
    expect(screen.getByText(/Täsmää/)).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    const input = jest.mocked(journalEntriesApi.create).mock.calls[0][0];
    expect(input.lines).toEqual([
      expect.objectContaining({ accountId: 'receivables', amount: 100, type: 'debit', vatRate: 0 }),
      expect.objectContaining({ accountId: 'sales', amount: 100, type: 'credit', vatRate: 0 }),
    ]);
  });

  it('keeps the VAT controls off until the company settings have loaded', async () => {
    mockApis({ vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: 'vat-payable' });
    let resolveSettings!: (settings: { vatRegistered: boolean }) => void;
    jest.mocked(companySettingsApi.get).mockReturnValue(
      new Promise((resolve) => {
        resolveSettings = resolve;
      }),
    );
    render(<JournalEntryDialog open onClose={() => {}} />);
    await waitFor(() => expect(companySettingsApi.get).toHaveBeenCalled());
    expect(lineCombobox(0, 'vatRate')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    resolveSettings({ vatRegistered: true });
    await waitFor(() => expect(lineCombobox(0, 'vatRate')).not.toHaveAttribute('aria-disabled'));
    expect(screen.getByLabelText('Automaattinen ALV')).toBeEnabled();
  });

  describe("an account's default VAT rate", () => {
    const VAT_ACCOUNTS = { vatReceivableAccountId: 'vat-receivable', vatPayableAccountId: 'vat-payable' };
    const vatRateOf = (line: number) => lineCombobox(line, 'vatRate');

    async function renderLoaded() {
      render(<JournalEntryDialog open onClose={() => {}} />);
      await waitFor(() => expect(vatRateOf(0)).not.toHaveAttribute('aria-disabled'));
    }

    it('is what a line starts with when the account is picked', async () => {
      mockApis(VAT_ACCOUNTS);
      await renderLoaded();
      fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Myyntilasku' } });
      await pickAccount(0, '1700');
      typeAmount(0, '+110');
      await pickAccount(1, '3020');
      typeAmount(1, '-100');

      // No rate was picked by hand: the sales account brought its 10 %.
      expect(vatRateOf(0)).toHaveTextContent(/^0 %$/);
      expect(vatRateOf(1)).toHaveTextContent(/^10 %$/);
      expect(screen.getByText(/Täsmää/)).toBeInTheDocument();

      fireEvent.click(submitButton());
      await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
      const input = jest.mocked(journalEntriesApi.create).mock.calls[0][0];
      expect(input.lines).toEqual([
        expect.objectContaining({ accountId: 'receivables', amount: 110, type: 'debit', vatRate: 0 }),
        expect.objectContaining({ accountId: 'sales-10', amount: 100, type: 'credit', vatRate: 10 }),
      ]);
    });

    it('gives way to a rate picked by hand, until another account is picked', async () => {
      mockApis(VAT_ACCOUNTS);
      await renderLoaded();
      await pickAccount(1, '3020');
      pickVatRate(1, '25,5 %');
      expect(vatRateOf(1)).toHaveTextContent(/^25,5 %$/);

      // An account without a default takes the line back to 0 %.
      await pickAccount(1, '1700');
      expect(vatRateOf(1)).toHaveTextContent(/^0 %$/);
      await pickAccount(1, '3020');
      expect(vatRateOf(1)).toHaveTextContent(/^10 %$/);
    });

    it('reaches an account picked before the company settings loaded', async () => {
      mockApis(VAT_ACCOUNTS);
      let resolveSettings!: (settings: { vatRegistered: boolean }) => void;
      jest.mocked(companySettingsApi.get).mockReturnValue(
        new Promise((resolve) => {
          resolveSettings = resolve;
        }),
      );
      render(<JournalEntryDialog open onClose={() => {}} />);
      await pickAccount(1, '3020');
      expect(vatRateOf(1)).toHaveTextContent(/^0 %$/);

      resolveSettings({ vatRegistered: true });
      await waitFor(() => expect(vatRateOf(1)).toHaveTextContent(/^10 %$/));
    });

    it('is left off the lines when the company is not VAT-registered', async () => {
      mockApis(VAT_ACCOUNTS, false);
      render(<JournalEntryDialog open onClose={() => {}} />);
      expect(await screen.findByRole('alert')).toHaveTextContent(/ei ole arvonlisäverovelvollinen/);

      fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Myyntilasku' } });
      await pickAccount(0, '1700');
      typeAmount(0, '+100');
      await pickAccount(1, '3020');
      typeAmount(1, '-100');

      expect(vatRateOf(1)).toHaveTextContent(/^0 %$/);
      expect(vatRateOf(1)).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByText(/ALV-rivit, jotka/)).not.toBeInTheDocument();
      expect(screen.getByText(/Täsmää/)).toBeInTheDocument();

      fireEvent.click(submitButton());
      await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
      const input = jest.mocked(journalEntriesApi.create).mock.calls[0][0];
      expect(input.lines).toEqual([
        expect.objectContaining({ accountId: 'receivables', amount: 100, type: 'debit', vatRate: 0 }),
        expect.objectContaining({ accountId: 'sales-10', amount: 100, type: 'credit', vatRate: 0 }),
      ]);
    });
  });
});
