import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../i18n';
import { accountsApi } from '../api/accounts';
import { bankAccountsApi } from '../api/bankAccounts';
import { bankStatementsApi } from '../api/bankStatements';
import { chartOfAccountsApi } from '../api/chartOfAccounts';
import { companySettingsApi } from '../api/companySettings';
import { costCentersApi } from '../api/costCenters';
import { filesApi } from '../api/files';
import { journalEntriesApi } from '../api/journalEntries';
import { useAuth } from '../auth/AuthContext';
import { openPdf, type PdfDocumentHandle } from '../lib/pdf';
import type { Account } from '../types/account';
import type { AuthContextValue, Role } from '../types/auth';
import type { BankAccount } from '../types/bankAccount';
import type {
  BankStatement,
  BankStatementLine,
  BankStatementSummary,
  CsvPreview,
} from '../types/bankStatement';
import type { JournalEntry, JournalEntryLine } from '../types/journal';
import BankStatements from './BankStatements';

jest.mock('../api/accounts');
jest.mock('../api/bankAccounts');
jest.mock('../api/bankStatements');
jest.mock('../api/chartOfAccounts');
jest.mock('../api/companySettings');
jest.mock('../api/costCenters');
jest.mock('../api/files');
jest.mock('../api/journalEntries');
jest.mock('../auth/AuthContext');
// The PDF engine itself can't be loaded by Jest (see src/lib/pdf.ts).
jest.mock('../lib/pdf');

// Driving the form in jsdom is slow (MUI Autocompletes), and the suites run in
// parallel: on a loaded machine a test can outlast the default 5 s.
jest.setTimeout(20000);

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
  account('bank', '1910', 'Pankkitili'),
  account('vat-payable', '2939', 'Arvonlisäverovelka'),
  account('sales', '3000', 'Myynti'),
];

const bankAccount = (id: string, name: string, iban: string, isActive = true): BankAccount => ({
  id,
  name,
  iban,
  accountId: 'bank',
  isActive,
  account: { id: 'bank', number: '1910', name: 'Pankkitili' },
  createdAt: '',
  updatedAt: '',
});

const MAIN = bankAccount('main', 'Käyttötili', 'FI2112345600000785');
const OLD = bankAccount('old', 'Vanha tili', 'DE89370400440532013000', false);

const statement = (
  id: string,
  name: string,
  overrides: Partial<BankStatement> = {},
): BankStatement => ({
  id,
  posted: false,
  bankAccountId: null,
  bankAccount: null,
  file: { id: `file-${id}`, originalName: name, size: 1000 },
  entryCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

const OF_MAIN = {
  bankAccountId: MAIN.id,
  bankAccount: { id: MAIN.id, name: MAIN.name, iban: MAIN.iban, accountId: MAIN.accountId },
};

const SEPTEMBER = statement('september', 'tiliote_syyskuu.pdf');
const AUGUST = statement('august', 'tiliote_elokuu.pdf', { ...OF_MAIN, posted: true, entryCount: 3 });

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

// A sale of 100,00 at 25,5 % paid to the bank.
const SALE: JournalEntry = {
  id: 'entry-1',
  voucherType: 'PAYMENT',
  voucherNumber: 7,
  date: '2026-09-15',
  description: 'Myyntisuoritus',
  accountId: 'bank',
  bankStatementId: 'september',
  createdById: 'user',
  createdAt: '',
  updatedAt: '',
  lines: [
    line('l1', 'bank', 'debit', 125.5),
    line('l2', 'sales', 'credit', 100, { rate: 25.5, amount: 25.5 }),
    line('l3', 'vat-payable', 'credit', 25.5, { isVat: true }),
  ],
};

const SUMMARY: BankStatementSummary = {
  bank: { deposits: 125.5, withdrawals: 227, net: -101.5 },
  vat: {
    receivable: 27,
    payable: 25.5,
    byRate: [
      { vatRate: 13.5, side: 'debit', base: 200, vat: 27 },
      { vatRate: 25.5, side: 'credit', base: 100, vat: 25.5 },
    ],
  },
};

function mockAuth(companyId: string, role: Role = 'LEDGER') {
  jest.mocked(useAuth).mockReturnValue({
    activeMembership: { companyId, companyName: companyId, role },
  } as unknown as AuthContextValue);
}

function mockStatements(statements: BankStatement[], total = statements.length) {
  jest
    .mocked(bankStatementsApi.list)
    .mockResolvedValue({ data: statements, meta: { total, take: 25, skip: 0 } });
}

const lastListFilter = () => jest.mocked(bankStatementsApi.list).mock.calls.at(-1)![0];

// The opened PDF, as far as the page is concerned. Drawing it is PdfPages'
// own business (see PdfPages.test.tsx).
let pdf: PdfDocumentHandle;

beforeEach(() => {
  mockStatements([SEPTEMBER, AUGUST]);
  jest.mocked(bankStatementsApi.import).mockResolvedValue(SEPTEMBER);
  jest
    .mocked(bankStatementsApi.update)
    .mockImplementation(async (id, patch) => ({
      ...(id === AUGUST.id ? AUGUST : SEPTEMBER),
      ...(patch.posted !== undefined ? { posted: patch.posted } : {}),
      ...(patch.bankAccountId ? OF_MAIN : {}),
    }));
  jest.mocked(bankStatementsApi.summary).mockResolvedValue(SUMMARY);
  // No imported transactions: the statement opens on its entries.
  jest.mocked(bankStatementsApi.lines).mockResolvedValue([]);
  jest
    .mocked(journalEntriesApi.list)
    .mockResolvedValue({ data: [SALE], meta: { total: 1, take: 25, skip: 0 } });
  jest.mocked(journalEntriesApi.create).mockResolvedValue(SALE);
  jest.mocked(journalEntriesApi.update).mockResolvedValue(SALE);
  jest.mocked(journalEntriesApi.remove).mockResolvedValue(undefined);
  jest.mocked(bankAccountsApi.list).mockResolvedValue([MAIN, OLD]);
  jest.mocked(accountsApi.list).mockResolvedValue(ACCOUNTS);
  jest.mocked(costCentersApi.list).mockResolvedValue([]);
  jest.mocked(chartOfAccountsApi.getVatAccounts).mockResolvedValue({
    vatReceivableAccountId: null,
    vatPayableAccountId: 'vat-payable',
  });
  jest.mocked(companySettingsApi.get).mockResolvedValue({ vatRegistered: true });
  jest
    .mocked(filesApi.content)
    .mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  pdf = {
    pageCount: 1,
    pageSize: jest.fn().mockResolvedValue({ width: 595, height: 842 }),
    renderPage: jest.fn(() => ({ done: Promise.resolve(), cancel: jest.fn() })),
    destroy: jest.fn(),
  };
  jest.mocked(openPdf).mockResolvedValue(pdf);
  // jsdom has no object URLs.
  URL.createObjectURL = jest.fn(() => 'blob:statement-pdf');
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const rowOf = (fileName: string) => screen.getByRole('row', { name: new RegExp(fileName) });

// The pane the statement's PDF is drawn in, named after the file.
const pdfPane = (fileName: string) => screen.queryByRole('region', { name: fileName });
const findPdfPane = (fileName: string) => screen.findByRole('region', { name: fileName });

// Opens a statement from the list and waits for both sides to have loaded.
async function openStatement(fileName: string) {
  fireEvent.click(await screen.findByText(fileName));
  await findPdfPane(fileName);
  await screen.findByText(/Panot/);
}

test('lists the unposted statements and, when asked, all of them', async () => {
  mockAuth('company-a');
  render(<BankStatements />);

  expect(await screen.findByText('tiliote_syyskuu.pdf')).toBeInTheDocument();
  expect(lastListFilter()).toEqual({ posted: false, take: 25, skip: 0 });
  expect(within(rowOf('tiliote_syyskuu.pdf')).getByText('Kirjaamaton')).toBeInTheDocument();
  const august = within(rowOf('tiliote_elokuu.pdf'));
  expect(august.getByText('Kirjattu')).toBeInTheDocument();
  expect(august.getByText('Käyttötili')).toBeInTheDocument();
  // Nothing is open yet.
  expect(screen.getByText(/Valitse tiliote listasta/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Kaikki' }));
  await waitFor(() => expect(lastListFilter()).toEqual({ take: 25, skip: 0 }));
});

test('shows the statements a page at a time, starting over when the filter changes', async () => {
  mockAuth('company-a');
  mockStatements([SEPTEMBER, AUGUST], 60);
  render(<BankStatements />);
  await screen.findByText('tiliote_syyskuu.pdf');

  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  await waitFor(() => expect(lastListFilter()).toEqual({ posted: false, take: 25, skip: 25 }));

  fireEvent.click(screen.getByRole('button', { name: 'Kaikki' }));
  await waitFor(() => expect(lastListFilter()).toEqual({ take: 25, skip: 0 }));
});

test('imports each picked PDF with a request of its own and says which ones failed', async () => {
  mockAuth('company-a');
  render(<BankStatements />);
  await screen.findByText('tiliote_syyskuu.pdf');
  const loads = jest.mocked(bankStatementsApi.list).mock.calls.length;

  const first = new File(['%PDF-1.4'], 'lokakuu.pdf', { type: 'application/pdf' });
  const second = new File(['ei pdf'], 'kuva.pdf', { type: 'application/pdf' });
  jest
    .mocked(bankStatementsApi.import)
    .mockResolvedValueOnce(SEPTEMBER)
    .mockRejectedValueOnce(new Error('Unsupported file type: a bank statement must be a PDF'));
  fireEvent.change(screen.getByLabelText('Tuo tiliotteita'), { target: { files: [first, second] } });

  await waitFor(() => expect(bankStatementsApi.import).toHaveBeenCalledTimes(2));
  expect(jest.mocked(bankStatementsApi.import).mock.calls.map(([file]) => file.name)).toEqual([
    'lokakuu.pdf',
    'kuva.pdf',
  ]);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'kuva.pdf: Unsupported file type: a bank statement must be a PDF',
  );
  // The list is read again for the one that got in.
  await waitFor(() =>
    expect(jest.mocked(bankStatementsApi.list).mock.calls.length).toBeGreaterThan(loads),
  );
});

test('opens a statement: its PDF in place of the list, its entries and sums on the left', async () => {
  mockAuth('company-a');
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  // Right: the PDF, fetched through the file API and drawn by ourselves
  // instead of the list. The browser's own viewer is not used for it.
  expect(filesApi.content).toHaveBeenCalledWith('file-september');
  expect(openPdf).toHaveBeenCalledWith(expect.any(Blob));
  expect(jest.mocked(openPdf).mock.calls[0][0].type).toBe('application/pdf');
  expect(screen.queryByTitle('tiliote_syyskuu.pdf')).not.toBeInTheDocument();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(screen.queryByRole('heading', { name: 'Tiliotteet' })).not.toBeInTheDocument();
  expect(screen.queryByText('tiliote_elokuu.pdf')).not.toBeInTheDocument();

  // Left: the entries booked from this statement, with their lines.
  expect(jest.mocked(journalEntriesApi.list).mock.calls.at(-1)![0]).toEqual({
    bankStatementId: 'september',
    take: 25,
    skip: 0,
  });
  expect(screen.getByText('Myyntisuoritus')).toBeInTheDocument();
  expect(screen.getByText('Maksu #7')).toBeInTheDocument();
  expect(screen.getByText('1910 Pankkitili')).toBeInTheDocument();

  // Foot: the bank account's total and the VAT by rate.
  expect(bankStatementsApi.summary).toHaveBeenCalledWith('september');
  expect(screen.getByText(/Panot: 125,50/)).toBeInTheDocument();
  expect(screen.getByText(/Otot: 227,00/)).toBeInTheDocument();
  expect(screen.getByText(/Muutos: .101,50/)).toBeInTheDocument();
  const purchases = within(screen.getByRole('row', { name: /^Ostot 13,5 %/ }));
  expect(purchases.getByText(/200,00/)).toBeInTheDocument();
  expect(purchases.getByText(/27,00/)).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /^Myynnit 25,5 %/ })).toBeInTheDocument();
  expect(screen.getByText(/Alv-saamiset: 27,00/)).toBeInTheDocument();
  expect(screen.getByText(/Alv-velka: 25,50/)).toBeInTheDocument();
});

test('opens the PDF in a new tab and closes it back to the list, keeping the statement open', async () => {
  mockAuth('company-a');
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  fireEvent.click(screen.getByRole('button', { name: 'Avaa uudessa välilehdessä' }));
  expect(open).toHaveBeenCalledWith('blob:statement-pdf', '_blank', 'noopener');

  fireEvent.click(screen.getByRole('button', { name: 'Sulje tiliote' }));
  expect(await screen.findByRole('heading', { name: 'Tiliotteet' })).toBeInTheDocument();
  expect(pdfPane('tiliote_syyskuu.pdf')).not.toBeInTheDocument();
  expect(rowOf('tiliote_syyskuu.pdf')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Myyntisuoritus')).toBeInTheDocument();

  // Its row brings the PDF back.
  fireEvent.click(rowOf('tiliote_syyskuu.pdf'));
  expect(await findPdfPane('tiliote_syyskuu.pdf')).toBeInTheDocument();
  // The URL given to the tab is left alone: the tab still shows the PDF.
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
});

test('frees the drawn PDF when it is closed', async () => {
  mockAuth('company-a');
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');
  await waitFor(() => expect(pdf.pageSize).toHaveBeenCalled());
  expect(pdf.destroy).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Sulje tiliote' }));
  await screen.findByRole('heading', { name: 'Tiliotteet' });
  expect(pdf.destroy).toHaveBeenCalledTimes(1);
});

test("falls back to the browser's own viewer when the PDF can't be drawn", async () => {
  mockAuth('company-a');
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(openPdf).mockRejectedValue(new Error('The engine did not start'));
  render(<BankStatements />);
  fireEvent.click(await screen.findByText('tiliote_syyskuu.pdf'));

  const frame = await screen.findByTitle('tiliote_syyskuu.pdf');
  expect(frame).toHaveAttribute('src', 'blob:statement-pdf');
  expect(pdfPane('tiliote_syyskuu.pdf')).not.toBeInTheDocument();
  expect(warn).toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Sulje tiliote' }));
  await screen.findByRole('heading', { name: 'Tiliotteet' });
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:statement-pdf');
});

test("saves the statement's bank account and the posted mark as they are chosen", async () => {
  mockAuth('company-a');
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  const picker = screen.getByRole('combobox', { name: /Pankkitili/ });
  expect(picker).toHaveTextContent('Ei valittu');
  fireEvent.mouseDown(picker);
  const options = within(screen.getByRole('listbox'));
  // A bank account taken out of use is not offered to a statement without it.
  expect(options.queryByText(/Vanha tili/)).not.toBeInTheDocument();
  fireEvent.click(options.getByText(/Käyttötili/));

  await waitFor(() =>
    expect(bankStatementsApi.update).toHaveBeenCalledWith('september', { bankAccountId: 'main' }),
  );
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: /Pankkitili/ })).toHaveTextContent('Käyttötili'),
  );
  // The sums are of the bank account, so they are read again.
  await waitFor(() => expect(bankStatementsApi.summary).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByRole('button', { name: 'Merkitse kirjatuksi' }));
  await waitFor(() =>
    expect(bankStatementsApi.update).toHaveBeenCalledWith('september', { posted: true }),
  );
  expect(await screen.findByRole('button', { name: 'Palauta kirjaamattomaksi' })).toBeInTheDocument();
  // Still open, although it has left the unposted ones.
  expect(screen.getByRole('heading', { name: 'tiliote_syyskuu.pdf', level: 2 })).toBeInTheDocument();
});

// With a statement open and its PDF on the right, the comboboxes are the bank
// account picker, the form's voucher type and then, for each line, an account,
// a VAT rate and a cost center.
const lineAccount = (index: number) => screen.getAllByRole('combobox')[2 + index * 3];
const amounts = () => screen.getAllByPlaceholderText('+100,00');

test('books a new entry on the left, next to the PDF, with the bank account prefilled', async () => {
  mockAuth('company-a');
  mockStatements([{ ...SEPTEMBER, ...OF_MAIN }]);
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  fireEvent.click(screen.getByRole('button', { name: 'Uusi kirjaus' }));
  expect(await screen.findByRole('heading', { name: 'Uusi kirjaus' })).toBeInTheDocument();
  // Not a dialog: the PDF stays where it was.
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(pdfPane('tiliote_syyskuu.pdf')).toBeInTheDocument();
  await waitFor(() => expect(lineAccount(0)).toHaveValue('1910 Pankkitili'));

  fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Käteismyynti' } });
  fireEvent.change(amounts()[0], { target: { value: '100' } });
  const second = lineAccount(1);
  act(() => second.focus());
  fireEvent.change(second, { target: { value: '3000' } });
  fireEvent.click(await screen.findByRole('option', { name: /^3000 / }));
  fireEvent.change(amounts()[1], { target: { value: '-100' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tallenna kirjaus' }));

  await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
  expect(jest.mocked(journalEntriesApi.create).mock.calls[0][0]).toMatchObject({
    bankStatementId: 'september',
    accountId: 'bank',
    lines: [
      { accountId: 'bank', amount: 100, type: 'debit' },
      { accountId: 'sales', amount: 100, type: 'credit' },
    ],
  });
  // Back to the entries, read again together with the sums.
  expect(await screen.findByRole('button', { name: 'Uusi kirjaus' })).toBeInTheDocument();
  await waitFor(() => expect(journalEntriesApi.list).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(bankStatementsApi.summary).toHaveBeenCalledTimes(2));
});

test('edits an entry of the statement in the same form', async () => {
  mockAuth('company-a');
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  fireEvent.click(screen.getByRole('button', { name: 'Muokkaa kirjausta Maksu #7' }));
  expect(
    await screen.findByRole('heading', { name: 'Muokkaa kirjausta Maksu #7' }),
  ).toBeInTheDocument();
  await waitFor(() => expect(amounts()).toHaveLength(2));
  expect(screen.getByLabelText(/^Selite/)).toHaveValue('Myyntisuoritus');

  fireEvent.change(screen.getByLabelText(/^Selite/), { target: { value: 'Korjattu selite' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tallenna kirjaus' }));

  await waitFor(() => expect(journalEntriesApi.update).toHaveBeenCalledTimes(1));
  const [id, input] = jest.mocked(journalEntriesApi.update).mock.calls[0];
  expect(id).toBe('entry-1');
  expect(input).toMatchObject({ description: 'Korjattu selite', accountId: 'bank' });
  expect(input.lines).toHaveLength(2);
  expect(await screen.findByRole('button', { name: 'Uusi kirjaus' })).toBeInTheDocument();
});

test('cancelling the form returns to the entries without saving anything', async () => {
  mockAuth('company-a');
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  fireEvent.click(screen.getByRole('button', { name: 'Uusi kirjaus' }));
  await screen.findByRole('heading', { name: 'Uusi kirjaus' });
  fireEvent.click(screen.getByRole('button', { name: 'Peruuta' }));

  expect(await screen.findByText('Myyntisuoritus')).toBeInTheDocument();
  expect(journalEntriesApi.create).not.toHaveBeenCalled();
});

test('deletes an entry only after it is confirmed, and shows a refusal', async () => {
  mockAuth('company-a');
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  fireEvent.click(screen.getByRole('button', { name: 'Poista kirjaus Maksu #7' }));
  expect(confirm).toHaveBeenCalledWith('Poistetaanko kirjaus Maksu #7? Tätä ei voi perua.');
  expect(journalEntriesApi.remove).not.toHaveBeenCalled();

  confirm.mockReturnValue(true);
  jest.mocked(journalEntriesApi.remove).mockRejectedValueOnce(new Error('Accounting period is closed'));
  fireEvent.click(screen.getByRole('button', { name: 'Poista kirjaus Maksu #7' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Accounting period is closed');

  fireEvent.click(screen.getByRole('button', { name: 'Poista kirjaus Maksu #7' }));
  await waitFor(() => expect(journalEntriesApi.remove).toHaveBeenCalledTimes(2));
  expect(journalEntriesApi.remove).toHaveBeenLastCalledWith('entry-1');
  await waitFor(() => expect(journalEntriesApi.list).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('asks before leaving an unfinished entry for another statement', async () => {
  mockAuth('company-a');
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Uusi kirjaus' }));
  await screen.findByRole('heading', { name: 'Uusi kirjaus' });
  fireEvent.click(screen.getByRole('button', { name: 'Sulje tiliote' }));

  fireEvent.click(await screen.findByText('tiliote_elokuu.pdf'));
  expect(confirm).toHaveBeenCalledWith('Kirjaus on kesken. Hylätäänkö se?');
  expect(screen.getByRole('heading', { name: 'tiliote_syyskuu.pdf', level: 2 })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Uusi kirjaus' })).toBeInTheDocument();

  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByText('tiliote_elokuu.pdf'));
  expect(await findPdfPane('tiliote_elokuu.pdf')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'tiliote_elokuu.pdf', level: 2 })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Uusi kirjaus' })).not.toBeInTheDocument();
  // The bank account it already has is shown, and so is its posted mark.
  expect(screen.getByRole('combobox', { name: /Pankkitili/ })).toHaveTextContent('Käyttötili');
  expect(screen.getByRole('button', { name: 'Palauta kirjaamattomaksi' })).toBeInTheDocument();
});

test('is read-only below the LEDGER role', async () => {
  mockAuth('company-a', 'VIEWER');
  render(<BankStatements />);

  expect(await screen.findByText('tiliote_syyskuu.pdf')).toBeInTheDocument();
  expect(screen.getByText(/Sinulla on lukuoikeus/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Tuo tiliotteita')).not.toBeInTheDocument();

  await openStatement('tiliote_syyskuu.pdf');
  expect(screen.getByText('Myyntisuoritus')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /Pankkitili/ })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.queryByRole('button', { name: 'Uusi kirjaus' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Muokkaa kirjausta/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Poista kirjaus/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Merkitse kirjatuksi' })).not.toBeInTheDocument();
});

test('starts over with the statements of the new company when the company changes', async () => {
  mockAuth('company-a');
  const { rerender } = render(<BankStatements />);
  await openStatement('tiliote_syyskuu.pdf');

  const theirs = statement('theirs', 'toisen_yrityksen_tiliote.pdf');
  mockStatements([theirs]);
  mockAuth('company-b');
  rerender(<BankStatements />);

  expect(await screen.findByText('toisen_yrityksen_tiliote.pdf')).toBeInTheDocument();
  expect(pdfPane('tiliote_syyskuu.pdf')).not.toBeInTheDocument();
  expect(screen.queryByText('Myyntisuoritus')).not.toBeInTheDocument();
  expect(screen.getByText(/Valitse tiliote listasta/)).toBeInTheDocument();
  expect(bankAccountsApi.list).toHaveBeenCalledTimes(2);
});

test('shows a backend error when the statements cannot be loaded', async () => {
  mockAuth('company-a');
  jest.mocked(bankStatementsApi.list).mockRejectedValue(new Error('Internal server error'));
  render(<BankStatements />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error');
});

describe("the statement's transactions", () => {
  const transaction = (overrides: Partial<BankStatementLine>): BankStatementLine => ({
    id: 'tx',
    position: 1,
    bookingDate: '2026-09-10',
    valueDate: null,
    amount: 0,
    counterparty: '',
    counterpartyAccount: '',
    reference: '',
    message: '',
    transactionType: '',
    archiveId: null,
    journalEntry: null,
    ...overrides,
  });

  // One booked into the sale entry, one still to book.
  const BOOKED = transaction({
    id: 'tx-1',
    amount: 125.5,
    counterparty: 'Asiakas Oy',
    message: 'Lasku 1001',
    journalEntry: { id: 'entry-1', voucherType: 'PAYMENT', voucherNumber: 7 },
  });
  const UNBOOKED = transaction({
    id: 'tx-2',
    position: 2,
    bookingDate: '2026-09-12',
    amount: -45.2,
    counterparty: 'Sähkö Oy',
    reference: '00000000000000012345',
  });

  const PREVIEW: CsvPreview = {
    layout: 'nordea',
    encoding: 'utf-8',
    delimiter: ';',
    columns: ['Kirjauspäivä', 'Määrä'],
    mapping: { bookingDate: [0], amount: [1] },
    mappingProblem: null,
    lines: [{ ...UNBOOKED, lineNumber: 2, duplicate: false }],
    skipped: [],
    accountMismatch: null,
  };

  const rowWith = async (text: string) => within((await screen.findByText(text)).closest('tr')!);

  beforeEach(() => {
    mockStatements([{ ...SEPTEMBER, ...OF_MAIN }]);
    jest.mocked(bankStatementsApi.lines).mockResolvedValue([BOOKED, UNBOOKED]);
    jest.mocked(journalEntriesApi.get).mockResolvedValue(SALE);
    jest.mocked(bankStatementsApi.removeLine).mockResolvedValue(undefined);
    jest.mocked(bankStatementsApi.csvPreview).mockResolvedValue(PREVIEW);
    jest.mocked(bankStatementsApi.importCsv).mockResolvedValue({ imported: 3, duplicates: 1, skipped: 0 });
  });

  test('a statement that has them opens on them, showing which are booked', async () => {
    mockAuth('company-a');
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');

    const tab = await screen.findByRole('tab', { name: 'Tapahtumat (1 / 2 kirjattu)' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(bankStatementsApi.lines).toHaveBeenCalledWith('september');
    const booked = await rowWith('Asiakas Oy');
    expect(booked.getByText('Lasku 1001')).toBeInTheDocument();
    expect(booked.getByRole('button', { name: 'Avaa kirjaus Maksu #7' })).toBeInTheDocument();
    const unbooked = await rowWith('Sähkö Oy');
    expect(unbooked.getByText('Viite 00000000000000012345')).toBeInTheDocument();
    expect(unbooked.getByText(/45,20/)).toBeInTheDocument();
    expect(unbooked.getByRole('button', { name: 'Kirjaa' })).toBeInTheDocument();

    // The entries are one tab away.
    fireEvent.click(screen.getByRole('tab', { name: 'Kirjaukset' }));
    expect(await screen.findByText('Myyntisuoritus')).toBeInTheDocument();
  });

  test('books a transaction with the entry form prefilled from it', async () => {
    mockAuth('company-a');
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');
    fireEvent.click((await rowWith('Sähkö Oy')).getByRole('button', { name: 'Kirjaa' }));

    expect(await screen.findByRole('heading', { name: 'Uusi kirjaus' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Selite/)).toHaveValue('Sähkö Oy – 00000000000000012345');
    expect(screen.getByLabelText(/^Päivämäärä/)).toHaveValue('2026-09-12');
    // The bank's amount includes any VAT.
    expect(screen.getByRole('button', { name: 'Brutto' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(lineAccount(0)).toHaveValue('1910 Pankkitili'));
    expect(amounts()[0]).toHaveValue('-45,20');
    expect(amounts()[1]).toHaveValue('45,20');
    expect(lineAccount(1)).toHaveValue('');

    const second = lineAccount(1);
    act(() => second.focus());
    fireEvent.change(second, { target: { value: '3000' } });
    fireEvent.click(await screen.findByRole('option', { name: /^3000 / }));
    fireEvent.click(screen.getByRole('button', { name: 'Tallenna kirjaus' }));

    await waitFor(() => expect(journalEntriesApi.create).toHaveBeenCalledTimes(1));
    expect(jest.mocked(journalEntriesApi.create).mock.calls[0][0]).toMatchObject({
      bankStatementId: 'september',
      bankStatementLineId: 'tx-2',
      date: '2026-09-12',
      vatBasis: 'gross',
      lines: [
        { accountId: 'bank', amount: 45.2, type: 'credit' },
        { accountId: 'sales', amount: 45.2, type: 'debit' },
      ],
    });
    // Back on the transactions, read again.
    await waitFor(() => expect(bankStatementsApi.lines).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('tab', { name: /^Tapahtumat/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('opens the entry a booked transaction went into', async () => {
    mockAuth('company-a');
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');
    fireEvent.click((await rowWith('Asiakas Oy')).getByRole('button', { name: 'Avaa kirjaus Maksu #7' }));

    expect(await screen.findByRole('heading', { name: 'Muokkaa kirjausta Maksu #7' })).toBeInTheDocument();
    expect(journalEntriesApi.get).toHaveBeenCalledWith('entry-1');
  });

  test('deletes an unbooked transaction only after it is confirmed', async () => {
    mockAuth('company-a');
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');
    const remove = (await rowWith('Sähkö Oy')).getByRole('button', { name: 'Poista tapahtuma' });
    expect((await rowWith('Asiakas Oy')).queryByRole('button', { name: 'Poista tapahtuma' })).not.toBeInTheDocument();

    fireEvent.click(remove);
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/^Poistetaanko tapahtuma 12\.09\.2026 Sähkö Oy .45,20/));
    expect(bankStatementsApi.removeLine).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(remove);
    await waitFor(() => expect(bankStatementsApi.removeLine).toHaveBeenCalledWith('september', 'tx-2'));
    await waitFor(() => expect(bankStatementsApi.lines).toHaveBeenCalledTimes(2));
  });

  test('imports a CSV and then shows the transactions, with what the import did', async () => {
    mockAuth('company-a');
    jest.mocked(bankStatementsApi.lines).mockResolvedValueOnce([]).mockResolvedValue([UNBOOKED]);
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');
    // Nothing imported yet: the statement opens on its entries.
    expect(await screen.findByRole('tab', { name: 'Kirjaukset' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Tuo CSV' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Tuo tapahtumat CSV-tiedostosta' }));
    const file = new File(['Kirjauspäivä;Määrä'], 'tapahtumat.csv', { type: 'text/csv' });
    fireEvent.change(dialog.getByLabelText('Valitse tiedosto'), { target: { files: [file] } });
    fireEvent.click(await dialog.findByRole('button', { name: 'Tuo 1 tapahtumaa' }));

    await waitFor(() => expect(bankStatementsApi.importCsv).toHaveBeenCalledWith('september', file, PREVIEW.mapping));
    expect(
      await screen.findByText('Tuotiin 3 tapahtumaa. Aiemmin tuotuja: 1. Ohitettuja rivejä: 0.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Tapahtumat (0 / 1 kirjattu)' })).toHaveAttribute('aria-selected', 'true');
    expect(await rowWith('Sähkö Oy')).toBeTruthy();
  });

  test("can't import a CSV before the statement has a bank account", async () => {
    mockAuth('company-a');
    mockStatements([SEPTEMBER]);
    jest.mocked(bankStatementsApi.lines).mockResolvedValue([]);
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');
    expect(await screen.findByRole('button', { name: 'Tuo CSV' })).toBeDisabled();
  });

  test('is read-only below the LEDGER role', async () => {
    mockAuth('company-a', 'VIEWER');
    render(<BankStatements />);
    await openStatement('tiliote_syyskuu.pdf');

    const unbooked = await rowWith('Sähkö Oy');
    expect(unbooked.getByText('Kirjaamatta')).toBeInTheDocument();
    expect(unbooked.queryByRole('button')).not.toBeInTheDocument();
    // The voucher is shown, but not opened for editing.
    const booked = await rowWith('Asiakas Oy');
    expect(booked.getByText('Maksu #7')).toBeInTheDocument();
    expect(booked.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tuo CSV' })).not.toBeInTheDocument();
  });
});
