import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../i18n';
import { accountsApi } from '../../api/accounts';
import { chartOfAccountsApi } from '../../api/chartOfAccounts';
import { companySettingsApi } from '../../api/companySettings';
import { costCentersApi } from '../../api/costCenters';
import { journalEntriesApi } from '../../api/journalEntries';
import type { Account } from '../../types/account';
import type { JournalEntry, JournalEntryLine } from '../../types/journal';
import JournalEntryForm, { type JournalEntryFormTarget } from './JournalEntryForm';

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
  account('bank', '1910', 'Pankkitili'),
  account('vat-payable', '2939', 'Arvonlisäverovelka'),
  account('sales', '3000', 'Myynti'),
  account('sales-10', '3020', 'Myynti 10 %', 10),
];

const line = (
  id: string,
  accountId: string,
  type: 'debit' | 'credit',
  amount: number,
  vat: { rate?: number; amount?: number; isVat?: boolean } = {},
): JournalEntryLine => ({
  id,
  accountId,
  type,
  amount,
  description: '',
  vatRate: vat.rate ?? 0,
  vatAmount: vat.amount ?? 0,
  isVat: vat.isVat ?? false,
  costCenterId: null,
});

// A sale of 100,00 at 25,5 % paid to the bank, as the backend stores it: the
// entered lines net and the VAT as a generated row. The sales account's own
// default rate is 10 %, which the saved line does not follow.
const SALE: JournalEntry = {
  id: 'entry-1',
  voucherType: 'PAYMENT',
  voucherNumber: 7,
  date: '2026-09-15',
  description: 'Myyntisuoritus',
  accountId: 'bank',
  bankStatementId: 'statement-1',
  createdById: 'user',
  createdAt: '',
  updatedAt: '',
  lines: [
    line('l1', 'bank', 'debit', 125.5),
    line('l2', 'sales-10', 'credit', 100, { rate: 25.5, amount: 25.5 }),
    line('l3', 'vat-payable', 'credit', 25.5, { isVat: true }),
  ],
};

beforeEach(() => {
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(costCentersApi.list).mockResolvedValue([]);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: null,
    vatPayableAccountId: 'vat-payable',
  });
  jest.mocked(companySettingsApi.get).mockResolvedValue({ vatRegistered: true });
  jest.mocked(journalEntriesApi.create).mockResolvedValue(SALE);
  jest.mocked(journalEntriesApi.update).mockResolvedValue(SALE);
});

function renderForm(
  target: JournalEntryFormTarget,
  handlers: { onCancel?: () => void; onSaved?: (entry: JournalEntry) => void } = {},
) {
  return render(
    <JournalEntryForm
      target={target}
      onCancel={handlers.onCancel ?? (() => {})}
      onSaved={handlers.onSaved}
    >
      {({ title, body, actions }) => (
        <div>
          <h2>{title}</h2>
          {body}
          {actions}
        </div>
      )}
    </JournalEntryForm>,
  );
}

// Fields are found by position, as in JournalEntryDialog.test.tsx: after the
// voucher type select, each line has an account, a VAT rate and a cost center
// combobox.
const lineCombobox = (index: number, field: 'account' | 'vatRate') =>
  screen.getAllByRole('combobox')[1 + index * 3 + (field === 'account' ? 0 : 1)];
const amounts = () => screen.getAllByPlaceholderText('+100,00') as HTMLInputElement[];
const submitButton = () => screen.getByRole('button', { name: 'Tallenna kirjaus' });

describe('a new entry opened with a prefill', () => {
  it('starts with the given account on its first line and is booked from the given statement', async () => {
    renderForm({ mode: 'create', initial: { lines: [{ accountId: 'bank' }], bankStatementId: 'statement-1' } });
    expect(screen.getByRole('heading', { name: 'Uusi kirjaus' })).toBeInTheDocument();
    await waitFor(() => expect(lineCombobox(0, 'account')).toHaveValue('1910 Pankkitili'));
    expect(lineCombobox(1, 'account')).toHaveValue('');

    fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Käteismyynti' } });
    fireEvent.change(amounts()[0], { target: { value: '100' } });
    const second = lineCombobox(1, 'account');
    act(() => second.focus());
    fireEvent.change(second, { target: { value: '3000' } });
    fireEvent.click(await screen.findByRole('option', { name: /^3000 / }));
    fireEvent.change(amounts()[1], { target: { value: '-100' } });

    fireEvent.click(submitButton());
    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    expect(jest.mocked(journalEntriesApi.create).mock.calls[0][0]).toMatchObject({
      voucherType: 'SALES',
      accountId: 'bank',
      bankStatementId: 'statement-1',
      lines: [
        { accountId: 'bank', amount: 100, type: 'debit' },
        { accountId: 'sales', amount: 100, type: 'credit' },
      ],
    });
  });

  it('sends no statement when none was given', async () => {
    renderForm({ mode: 'create', initial: { lines: [{ accountId: 'bank' }] } });
    await waitFor(() => expect(lineCombobox(0, 'account')).toHaveValue('1910 Pankkitili'));
    fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Siirto' } });
    fireEvent.change(amounts()[0], { target: { value: '100' } });
    const second = lineCombobox(1, 'account');
    act(() => second.focus());
    fireEvent.change(second, { target: { value: '3000' } });
    fireEvent.click(await screen.findByRole('option', { name: /^3000 / }));
    fireEvent.change(amounts()[1], { target: { value: '-100' } });

    fireEvent.click(submitButton());
    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    expect(jest.mocked(journalEntriesApi.create).mock.calls[0][0]).not.toHaveProperty(
      'bankStatementId',
    );
  });
});

describe('a saved entry', () => {
  it('opens with its entered lines as saved and without its VAT rows', async () => {
    renderForm({ mode: 'edit', entry: SALE });
    expect(screen.getByRole('heading', { name: 'Muokkaa kirjausta Maksu #7' })).toBeInTheDocument();
    // The lines wait for the accounts they point at.
    await waitFor(() => expect(amounts()).toHaveLength(2));

    expect(screen.getByLabelText(/^Selite/)).toHaveValue('Myyntisuoritus');
    expect(screen.getByLabelText(/^Päivämäärä/)).toHaveValue('2026-09-15');
    expect(lineCombobox(0, 'account')).toHaveValue('1910 Pankkitili');
    expect(amounts()[0]).toHaveValue('125,50');
    expect(lineCombobox(1, 'account')).toHaveValue('3020 Myynti 10 %');
    expect(amounts()[1]).toHaveValue('-100,00');
    // The rate the line was saved with, not the account's default.
    expect(lineCombobox(1, 'vatRate')).toHaveTextContent(/^25,5 %$/);
    // The VAT row is generated again, and the entry balances with it.
    expect(screen.getByText('2939 Arvonlisäverovelka')).toBeInTheDocument();
    expect(screen.getByText(/Täsmää/)).toBeInTheDocument();
    expect(screen.getByLabelText('Automaattinen ALV')).toBeChecked();
    // The voucher type belongs to the voucher number and can't be changed.
    expect(screen.getAllByRole('combobox')[0]).toHaveAttribute('aria-disabled', 'true');
  });

  it('is saved as an update, without a voucher type or a statement', async () => {
    const onSaved = jest.fn();
    renderForm({ mode: 'edit', entry: SALE }, { onSaved });
    await waitFor(() => expect(amounts()).toHaveLength(2));

    fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Korjattu selite' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(journalEntriesApi.update).toHaveBeenCalledTimes(1));
    const [id, input] = jest.mocked(journalEntriesApi.update).mock.calls[0];
    expect(id).toBe('entry-1');
    expect(input).toEqual({
      date: '2026-09-15',
      description: 'Korjattu selite',
      accountId: 'bank',
      vatBasis: 'net',
      automaticVat: true,
      lines: [
        { accountId: 'bank', costCenterId: null, amount: 125.5, vatRate: 0, type: 'debit' },
        { accountId: 'sales-10', costCenterId: null, amount: 100, vatRate: 25.5, type: 'credit' },
      ],
    });
    expect(journalEntriesApi.create).not.toHaveBeenCalled();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(SALE));
  });

  it('opens with automatic VAT off when its VAT was booked by hand', async () => {
    const byHand: JournalEntry = {
      ...SALE,
      lines: [
        line('l1', 'bank', 'debit', 125.5),
        line('l2', 'sales', 'credit', 100, { rate: 25.5, amount: 25.5 }),
        line('l3', 'vat-payable', 'credit', 25.5),
      ],
    };
    renderForm({ mode: 'edit', entry: byHand });
    await waitFor(() => expect(amounts()).toHaveLength(3));

    expect(screen.getByLabelText('Automaattinen ALV')).not.toBeChecked();
    expect(amounts()[2]).toHaveValue('-25,50');
    expect(screen.queryByText(/ALV-rivit, jotka/)).not.toBeInTheDocument();
    expect(screen.getByText(/Täsmää/)).toBeInTheDocument();
  });

  it('shows what the backend answers when it refuses the change', async () => {
    jest.mocked(journalEntriesApi.update).mockRejectedValue(new Error('Accounting period is closed'));
    const onSaved = jest.fn();
    renderForm({ mode: 'edit', entry: SALE }, { onSaved });
    await waitFor(() => expect(amounts()).toHaveLength(2));

    fireEvent.click(submitButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Accounting period is closed');
    expect(onSaved).not.toHaveBeenCalled();
  });
});

it('hands cancelling to its host', async () => {
  const onCancel = jest.fn();
  renderForm({ mode: 'create' }, { onCancel });
  await waitFor(() => expect(screen.getByLabelText('Automaattinen ALV')).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Peruuta' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

describe('a new entry opened from a statement transaction', () => {
  it('starts with its date, description, gross amounts and both lines, and books the transaction', async () => {
    renderForm({
      mode: 'create',
      initial: {
        bankStatementId: 'statement-1',
        bankStatementLineId: 'line-1',
        date: '2026-09-12',
        description: 'Sähkö Oy – 00000000000000012345',
        vatBasis: 'gross',
        lines: [{ accountId: 'bank', amount: -45.2 }, { amount: 45.2 }],
      },
    });
    expect(screen.getByLabelText(/^Päivämäärä/)).toHaveValue('2026-09-12');
    expect(screen.getByLabelText(/^Selite/)).toHaveValue('Sähkö Oy – 00000000000000012345');
    expect(screen.getByRole('button', { name: 'Brutto' })).toHaveAttribute('aria-pressed', 'true');
    expect(amounts().map((input) => input.value)).toEqual(['-45,20', '45,20']);
    await waitFor(() => expect(lineCombobox(0, 'account')).toHaveValue('1910 Pankkitili'));
    expect(lineCombobox(1, 'account')).toHaveValue('');

    const second = lineCombobox(1, 'account');
    act(() => second.focus());
    fireEvent.change(second, { target: { value: '3000' } });
    fireEvent.click(await screen.findByRole('option', { name: /^3000 / }));
    fireEvent.click(submitButton());

    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    expect(jest.mocked(journalEntriesApi.create).mock.calls[0][0]).toMatchObject({
      date: '2026-09-12',
      vatBasis: 'gross',
      bankStatementId: 'statement-1',
      bankStatementLineId: 'line-1',
      lines: [
        { accountId: 'bank', amount: 45.2, type: 'credit' },
        { accountId: 'sales', amount: 45.2, type: 'debit' },
      ],
    });
  });
});
