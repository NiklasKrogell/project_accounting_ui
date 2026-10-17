import { fireEvent, render as renderInDom, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import { purchaseInvoicesApi } from '../api/purchaseInvoices';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency } from '../lib/format';
import type { AuthContextValue } from '../types/auth';
import type { PurchaseInvoice } from '../types/purchaseInvoice';
import PurchaseInvoices from './PurchaseInvoices';

jest.mock('../api/purchaseInvoices');
jest.mock('../auth/AuthContext');

// The page reloads on every navigation (location.key), so it needs a router.
const render = (ui: ReactElement) => renderInDom(<MemoryRouter>{ui}</MemoryRouter>);

const invoice = (
  id: string,
  invoiceNumber: string,
  supplierName: string,
  overrides: Partial<PurchaseInvoice> = {},
): PurchaseInvoice => ({
  id,
  supplierId: `supplier-${id}`,
  supplier: { id: `supplier-${id}`, name: supplierName },
  invoiceNumber,
  paymentReference: null,
  invoiceDate: '2025-03-10',
  entryDate: '2025-03-12',
  dueDate: '2025-03-24',
  totalAmount: 125.5,
  iban: null,
  bic: null,
  description: '',
  vatBasis: 'net',
  status: 'NEW',
  netTotal: 100,
  vatTotal: 25.5,
  grossTotal: 125.5,
  journalEntryId: null,
  createdById: 'user',
  approvedById: null,
  approvedAt: null,
  rejectedById: null,
  rejectedAt: null,
  rejectionReason: null,
  paidById: null,
  paidAt: null,
  paymentDate: null,
  createdAt: '',
  updatedAt: '',
  lines: [],
  fileCount: 0,
  ...overrides,
});

const PAPER = invoice('paper', 'A-1001', 'Paperi Oy', { paymentReference: '1234561' });
const CAFE = invoice('cafe', 'B-77', 'Kahvila Oy', {
  invoiceDate: '2025-02-01',
  dueDate: '2025-02-15',
  status: 'PAID',
  totalAmount: 1234.56,
});

function mockInvoices(invoices: PurchaseInvoice[], total = invoices.length) {
  jest
    .mocked(purchaseInvoicesApi.list)
    .mockResolvedValue({ data: invoices, meta: { total, take: 25, skip: 0 } });
}

const lastListFilter = () => jest.mocked(purchaseInvoicesApi.list).mock.calls.at(-1)![0];

// What the page asks for before anything is picked: all invoices, newest first.
const FIRST_PAGE = { statuses: [], sort: 'invoiceDate', order: 'desc', take: 25, skip: 0 };

beforeEach(() => {
  jest.mocked(useAuth).mockReturnValue({
    activeMembership: { companyId: 'company-a', companyName: 'Yritys A', role: 'VIEWER' },
  } as unknown as AuthContextValue);
  mockInvoices([PAPER, CAFE]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// An amount as the page shows it, its no-break spaces as Testing Library reads
// them: as plain ones.
const amount = (value: number) => formatCurrency(value, 'fi').replace(/\s/g, ' ');

const rowOf = (invoiceNumber: string) =>
  screen.getByRole('row', { name: new RegExp(invoiceNumber) });

test('lists the invoices newest first with their details under a header row', async () => {
  render(<PurchaseInvoices />);

  expect(await screen.findByText('A-1001')).toBeInTheDocument();
  expect(lastListFilter()).toEqual(FIRST_PAGE);
  expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
    'Laskunumero',
    'Toimittaja',
    'Laskun pvm',
    'Eräpäivä',
    'Viitenumero',
    'Summa',
    'Tila',
  ]);
  expect(screen.getByRole('columnheader', { name: /Laskun pvm/ })).toHaveAttribute(
    'aria-sort',
    'descending',
  );

  const paper = within(rowOf('A-1001'));
  expect(paper.getByText('Paperi Oy')).toBeInTheDocument();
  expect(paper.getByText('10.03.2025')).toBeInTheDocument();
  expect(paper.getByText('24.03.2025')).toBeInTheDocument();
  // The reference as a bank prints it.
  expect(paper.getByText('12 34561')).toBeInTheDocument();
  expect(paper.getByText(amount(125.5))).toBeInTheDocument();
  expect(paper.getByText('Uusi')).toBeInTheDocument();
  const cafe = within(rowOf('B-77'));
  expect(cafe.getByText(amount(1234.56))).toBeInTheDocument();
  expect(cafe.getByText('Maksettu')).toBeInTheDocument();

  expect(screen.getByText('Laskuja sivulla')).toBeInTheDocument();
  expect(screen.getByText('1–2 / 2')).toBeInTheDocument();
});

test('sorts by a column when its header is clicked, the other way round on a second click', async () => {
  mockInvoices([PAPER, CAFE], 60);
  render(<PurchaseInvoices />);
  await screen.findByText('A-1001');
  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  await waitFor(() => expect(lastListFilter()).toMatchObject({ skip: 25 }));

  fireEvent.click(screen.getByRole('button', { name: 'Toimittaja' }));
  await waitFor(() =>
    expect(lastListFilter()).toEqual({ ...FIRST_PAGE, sort: 'supplier', order: 'asc' }),
  );
  expect(screen.getByRole('columnheader', { name: /Toimittaja/ })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );

  fireEvent.click(screen.getByRole('button', { name: /Toimittaja/ }));
  await waitFor(() =>
    expect(lastListFilter()).toEqual({ ...FIRST_PAGE, sort: 'supplier', order: 'desc' }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'Summa' }));
  await waitFor(() =>
    expect(lastListFilter()).toEqual({ ...FIRST_PAGE, sort: 'totalAmount', order: 'asc' }),
  );
});

test('filters by status, invoice date and due date, starting over from page one', async () => {
  mockInvoices([PAPER, CAFE], 60);
  render(<PurchaseInvoices />);
  await screen.findByText('A-1001');
  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  await waitFor(() => expect(lastListFilter()).toMatchObject({ skip: 25 }));

  const filters = within(screen.getByRole('complementary', { name: 'Rajaukset' }));
  fireEvent.click(filters.getByRole('checkbox', { name: 'Maksettu' }));
  await waitFor(() => expect(lastListFilter()).toEqual({ ...FIRST_PAGE, statuses: ['PAID'] }));
  // In the order of the statuses, whichever is ticked first.
  fireEvent.click(filters.getByRole('checkbox', { name: 'Hyväksytty' }));
  await waitFor(() =>
    expect(lastListFilter()).toMatchObject({ statuses: ['APPROVED', 'PAID'], skip: 0 }),
  );

  const invoiceDate = within(filters.getByRole('group', { name: 'Laskun päivämäärä' }));
  fireEvent.change(invoiceDate.getByLabelText('Alkaen'), { target: { value: '2025-01-01' } });
  fireEvent.change(invoiceDate.getByLabelText('Päättyen'), { target: { value: '2025-03-31' } });
  const dueDate = within(filters.getByRole('group', { name: 'Eräpäivä' }));
  fireEvent.change(dueDate.getByLabelText('Päättyen'), { target: { value: '2025-04-30' } });
  await waitFor(() =>
    expect(lastListFilter()).toEqual({
      ...FIRST_PAGE,
      statuses: ['APPROVED', 'PAID'],
      invoiceDateFrom: '2025-01-01',
      invoiceDateTo: '2025-03-31',
      dueTo: '2025-04-30',
    }),
  );

  fireEvent.click(filters.getByRole('button', { name: 'Tyhjennä rajaukset' }));
  await waitFor(() => expect(lastListFilter()).toEqual(FIRST_PAGE));
  expect(filters.getByRole('button', { name: 'Tyhjennä rajaukset' })).toBeDisabled();
});

test('searches once typing pauses', async () => {
  render(<PurchaseInvoices />);
  await screen.findByText('A-1001');
  const loads = jest.mocked(purchaseInvoicesApi.list).mock.calls.length;

  fireEvent.change(screen.getByRole('searchbox', { name: 'Hae' }), { target: { value: 'Pap' } });
  fireEvent.change(screen.getByRole('searchbox', { name: 'Hae' }), {
    target: { value: 'Paperi' },
  });
  // Nothing is asked for while still typing.
  expect(purchaseInvoicesApi.list).toHaveBeenCalledTimes(loads);

  await waitFor(() => expect(lastListFilter()).toEqual({ ...FIRST_PAGE, search: 'Paperi' }));
  expect(purchaseInvoicesApi.list).toHaveBeenCalledTimes(loads + 1);
});

test('tells no invoices at all from none that match the filters', async () => {
  mockInvoices([]);
  render(<PurchaseInvoices />);
  expect(await screen.findByText('Ei ostolaskuja vielä.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Hylätty' }));
  expect(
    await screen.findByText('Rajauksia vastaavia ostolaskuja ei löytynyt.'),
  ).toBeInTheDocument();
});

test('shows why the list could not be loaded', async () => {
  jest.mocked(purchaseInvoicesApi.list).mockRejectedValue(new Error('Palvelin ei vastaa'));
  render(<PurchaseInvoices />);
  expect(await screen.findByText('Palvelin ei vastaa')).toBeInTheDocument();
});
