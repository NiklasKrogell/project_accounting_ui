import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../i18n';
import { ApiError } from '../../api/client';
import { purchaseInvoicesApi } from '../../api/purchaseInvoices';
import { suppliersApi } from '../../api/suppliers';
import { openPdf, type PdfDocumentHandle } from '../../lib/pdf';
import type { PurchaseInvoice } from '../../types/purchaseInvoice';
import type { Supplier } from '../../types/supplier';
import NewPurchaseInvoiceDialog from './NewPurchaseInvoiceDialog';

jest.mock('../../api/purchaseInvoices');
jest.mock('../../api/suppliers');
// The PDF engine itself can't be loaded by Jest (see src/lib/pdf.ts).
jest.mock('../../lib/pdf');

// Driving MUI Autocompletes in jsdom is slow, and the suites run in parallel.
jest.setTimeout(20000);

const supplier = (id: string, name: string, overrides: Partial<Supplier> = {}): Supplier => ({
  id,
  name,
  businessId: null,
  vatNumber: null,
  email: null,
  phone: null,
  streetAddress: null,
  postalCode: null,
  city: null,
  country: 'FI',
  iban: null,
  bic: null,
  defaultAccountId: null,
  defaultAccount: null,
  defaultVatRate: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const PAPER = supplier('paper', 'Paperitukku Oy', {
  businessId: '1234567-1',
  iban: 'FI2112345600000785',
  bic: 'NDEAFIHH',
});
const CAFE = supplier('cafe', 'Kahvila Oy');

const SAVED = { id: 'invoice' } as PurchaseInvoice;

let onClose: jest.Mock;
let onSaved: jest.Mock;

beforeEach(() => {
  onClose = jest.fn();
  onSaved = jest.fn();
  jest.mocked(suppliersApi.list).mockResolvedValue([CAFE, PAPER]);
  jest.mocked(purchaseInvoicesApi.create).mockResolvedValue(SAVED);
  const pdf: PdfDocumentHandle = {
    pageCount: 1,
    pageSize: jest.fn().mockResolvedValue({ width: 595, height: 842 }),
    renderPage: jest.fn(() => ({ done: Promise.resolve(), cancel: jest.fn() })),
    destroy: jest.fn(),
  };
  jest.mocked(openPdf).mockResolvedValue(pdf);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderDialog = () =>
  render(<NewPurchaseInvoiceDialog open onClose={onClose} onSaved={onSaved} />);

const details = () => within(screen.getByRole('region', { name: 'Laskun tiedot' }));
const supplierBox = () => details().getByRole('combobox', { name: 'Toimittaja' });
const field = (name: string) => details().getByRole('textbox', { name });
const dateField = (label: RegExp) => details().getByLabelText(label);
const saveButton = () => screen.getByRole('button', { name: 'Tallenna' });

const type = (element: HTMLElement, value: string) => {
  fireEvent.change(element, { target: { value } });
  fireEvent.blur(element);
};

async function pickSupplier(name: string) {
  fireEvent.change(supplierBox(), { target: { value: name.slice(0, 4) } });
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }));
}

// Everything an invoice needs, for the supplier picked already.
function fillRequired() {
  type(field('Laskunumero'), 'A-1001');
  type(dateField(/^Laskun päivämäärä/), '2025-03-10');
  type(dateField(/^Eräpäivä/), '2025-03-24');
  type(field('Summa (verollinen)'), '1 234,56');
}

test('saves the details as a new invoice without rows once everything needed is there', async () => {
  renderDialog();
  expect(saveButton()).toBeDisabled();

  await pickSupplier('Paperitukku Oy');
  // The supplier's bank details are filled in.
  expect(field('IBAN')).toHaveValue('FI21 1234 5600 0007 85');
  expect(field('BIC')).toHaveValue('NDEAFIHH');
  fillRequired();
  // The entry date follows the invoice date.
  expect(dateField(/^Kirjauspäivä/)).toHaveValue('2025-03-10');
  type(field('Viitenumero'), '12 344');
  type(field('Kuvaus'), ' Toimistotarvikkeet ');

  expect(saveButton()).toBeEnabled();
  fireEvent.click(saveButton());

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(SAVED));
  expect(purchaseInvoicesApi.create).toHaveBeenCalledWith(
    {
      supplierId: 'paper',
      invoiceNumber: 'A-1001',
      paymentReference: '12344',
      invoiceDate: '2025-03-10',
      entryDate: '2025-03-10',
      dueDate: '2025-03-24',
      totalAmount: 1234.56,
      iban: 'FI2112345600000785',
      bic: 'NDEAFIHH',
      description: 'Toimistotarvikkeet',
      vatBasis: 'net',
      lines: [],
    },
    undefined,
  );
  expect(onClose).toHaveBeenCalled();
});

test('keeps an entry date set by hand when the invoice date changes', async () => {
  renderDialog();
  type(dateField(/^Laskun päivämäärä/), '2025-03-10');
  type(dateField(/^Kirjauspäivä/), '2025-03-15');
  type(dateField(/^Laskun päivämäärä/), '2025-03-11');
  expect(dateField(/^Kirjauspäivä/)).toHaveValue('2025-03-15');
});

test('points out a wrong total, reference, IBAN or due date and keeps Save disabled', async () => {
  renderDialog();
  await pickSupplier('Kahvila Oy');
  fillRequired();
  expect(saveButton()).toBeEnabled();

  type(field('Summa (verollinen)'), '12,345');
  expect(screen.getByText('Anna summa euroina, esim. 125,50')).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
  type(field('Summa (verollinen)'), '0');
  expect(saveButton()).toBeDisabled();
  type(field('Summa (verollinen)'), '125,50');

  type(field('Viitenumero'), '12345');
  expect(screen.getByText('Viitenumero ei ole oikein: tarkista numerot')).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
  type(field('Viitenumero'), '12344');

  type(field('IBAN'), 'FI21 1234 5600 0007 86');
  expect(screen.getByText('IBAN ei ole oikein: tarkista numerot')).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
  type(field('IBAN'), '');

  type(dateField(/^Eräpäivä/), '2025-03-09');
  expect(screen.getByText('Eräpäivä ei voi olla ennen laskun päivämäärää')).toBeInTheDocument();
  expect(saveButton()).toBeDisabled();
  type(dateField(/^Eräpäivä/), '2025-03-10');
  expect(saveButton()).toBeEnabled();
});

test("replaces the bank details another supplier filled in, but never ones typed by hand", async () => {
  renderDialog();
  await pickSupplier('Paperitukku Oy');
  expect(field('IBAN')).toHaveValue('FI21 1234 5600 0007 85');
  // Kahvila Oy has no bank details of its own.
  await pickSupplier('Kahvila Oy');
  expect(field('IBAN')).toHaveValue('');
  expect(field('BIC')).toHaveValue('');

  type(field('IBAN'), 'DE89 3704 0044 0532 0130 00');
  await pickSupplier('Paperitukku Oy');
  expect(field('IBAN')).toHaveValue('DE89 3704 0044 0532 0130 00');
  expect(field('BIC')).toHaveValue('NDEAFIHH');
});

test('shows a PDF that is added and sends it with the invoice', async () => {
  renderDialog();
  const pdf = new File(['%PDF-1.4'], 'lasku.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Valitse tiedosto'), { target: { files: [pdf] } });

  // Drawn in the pane, with a button to take it off again.
  await waitFor(() => expect(openPdf).toHaveBeenCalledWith(pdf));
  expect(screen.getByText('lasku.pdf')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Poista PDF' })).toBeInTheDocument();

  await pickSupplier('Kahvila Oy');
  fillRequired();
  fireEvent.click(saveButton());
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(jest.mocked(purchaseInvoicesApi.create).mock.calls[0][1]).toBe(pdf);
});

test('takes the PDF off, and refuses a file that is no PDF', async () => {
  renderDialog();
  const pdf = new File(['%PDF-1.4'], 'lasku.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Valitse tiedosto'), { target: { files: [pdf] } });
  fireEvent.click(await screen.findByRole('button', { name: 'Poista PDF' }));
  expect(screen.getByText('Pudota laskun PDF tähän')).toBeInTheDocument();

  const image = new File(['png'], 'kuva.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Valitse tiedosto'), { target: { files: [image] } });
  expect(screen.getByText('kuva.png ei ole PDF-tiedosto.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Poista PDF' })).not.toBeInTheDocument();
});

test('tells when the supplier already has an invoice with the number', async () => {
  jest
    .mocked(purchaseInvoicesApi.create)
    .mockRejectedValue(new ApiError('The supplier already has an invoice with that number', 409));
  renderDialog();
  await pickSupplier('Paperitukku Oy');
  fillRequired();
  fireEvent.click(saveButton());

  expect(
    await screen.findByText('Toimittajalta Paperitukku Oy on jo lasku tällä numerolla.'),
  ).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(saveButton()).toBeEnabled();
});

test('adds a supplier from the picker, checking its business ID, and picks it', async () => {
  const created = supplier('new', 'Uusi Oy', {
    businessId: '1234567-1',
    vatNumber: 'FI12345671',
    iban: 'FI2112345600000785',
  });
  jest.mocked(suppliersApi.create).mockResolvedValue(created);
  renderDialog();

  fireEvent.change(supplierBox(), { target: { value: 'Uusi Oy' } });
  fireEvent.click(await screen.findByRole('option', { name: 'Lisää uusi toimittaja "Uusi Oy"' }));

  const quick = within(await screen.findByRole('dialog', { name: 'Uusi toimittaja' }));
  expect(quick.getByRole('textbox', { name: 'Nimi' })).toHaveValue('Uusi Oy');
  type(quick.getByRole('textbox', { name: 'Y-tunnus' }), '1234567-2');
  expect(quick.getByText('Y-tunnus ei ole oikein: tarkista numerot')).toBeInTheDocument();
  expect(quick.getByRole('button', { name: 'Lisää toimittaja' })).toBeDisabled();
  type(quick.getByRole('textbox', { name: 'Y-tunnus' }), '1234567 1');
  type(quick.getByRole('textbox', { name: 'ALV-numero' }), 'FI12345672');
  expect(quick.getByText('Y-tunnuksen mukainen ALV-numero on FI12345671')).toBeInTheDocument();
  type(quick.getByRole('textbox', { name: 'ALV-numero' }), 'FI 1234 5671');
  type(quick.getByRole('textbox', { name: 'IBAN' }), 'FI21 1234 5600 0007 85');
  fireEvent.click(quick.getByRole('button', { name: 'Lisää toimittaja' }));

  await waitFor(() => expect(supplierBox()).toHaveValue('Uusi Oy'));
  expect(suppliersApi.create).toHaveBeenCalledWith({
    name: 'Uusi Oy',
    businessId: '1234567-1',
    vatNumber: 'FI12345671',
    email: null,
    phone: null,
    streetAddress: null,
    postalCode: null,
    city: null,
    country: 'FI',
    iban: 'FI2112345600000785',
    bic: null,
    defaultAccountId: null,
    defaultVatRate: null,
  });
  expect(field('IBAN')).toHaveValue('FI21 1234 5600 0007 85');
  expect(screen.queryByRole('dialog', { name: 'Uusi toimittaja' })).not.toBeInTheDocument();
});

test('asks before throwing away what was typed, and only then', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  renderDialog();
  fireEvent.click(screen.getByRole('button', { name: 'Peruuta' }));
  expect(confirm).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);

  type(field('Laskunumero'), 'A-1');
  fireEvent.click(screen.getByRole('button', { name: 'Peruuta' }));
  expect(confirm).toHaveBeenCalledWith('Lasku on kesken. Hylätäänkö se?');
  expect(onClose).toHaveBeenCalledTimes(1);

  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Peruuta' }));
  expect(onClose).toHaveBeenCalledTimes(2);
});
