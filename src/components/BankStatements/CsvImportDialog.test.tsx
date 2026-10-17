import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../i18n';
import { bankStatementsApi } from '../../api/bankStatements';
import type { BankStatement, CsvPreview } from '../../types/bankStatement';
import { CsvImportDialog } from './CsvImportDialog';

jest.mock('../../api/bankStatements');

const STATEMENT: BankStatement = {
  id: 'september',
  posted: false,
  bankAccountId: 'main',
  bankAccount: { id: 'main', name: 'Käyttötili', iban: 'FI1410093000123458', accountId: 'bank' },
  file: { id: 'file-september', originalName: 'tiliote_syyskuu.pdf', size: 1000 },
  entryCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

const COLUMNS = ['Kirjauspäivä', 'Määrä', 'Maksaja', 'Maksunsaaja', 'Nimi', 'Otsikko', 'Viesti', 'Viitenumero', 'Saldo', 'Valuutta'];

const line = (lineNumber: number, counterparty: string, amount: number, duplicate = false) => ({
  lineNumber,
  bookingDate: '2026-09-10',
  valueDate: null,
  amount,
  counterparty,
  counterpartyAccount: '',
  reference: '',
  message: '',
  transactionType: '',
  archiveId: null,
  duplicate,
});

// What the server makes of a Nordea export: its columns guessed, three
// transactions of which one was imported before, a pending payment skipped.
const PREVIEW: CsvPreview = {
  layout: 'nordea',
  encoding: 'utf-8',
  delimiter: ';',
  columns: COLUMNS,
  mapping: { bookingDate: [0], amount: [1], counterpartyAccount: [3, 2], counterparty: [4], message: [6], reference: [7] },
  mappingProblem: null,
  lines: [line(5, 'Kioski', -4.5), line(4, 'Vuokranantaja Oy', -120, true), line(3, 'Asiakas Oy', 1500)],
  skipped: [{ lineNumber: 2, reason: 'pending' }],
  accountMismatch: null,
};

const FILE = new File(['Kirjauspäivä;Määrä'], 'Käyttötili.csv', { type: 'text/csv' });

function renderDialog(onImported = jest.fn()) {
  render(<CsvImportDialog open statement={STATEMENT} lang="fi" onClose={jest.fn()} onImported={onImported} />);
  return onImported;
}

async function pickFile() {
  fireEvent.change(screen.getByLabelText('Valitse tiedosto'), { target: { files: [FILE] } });
  await screen.findByText('Tunnistettu: Nordean tilitapahtumat.');
}

// The name is the label and then the columns chosen. (Not \b: to a regular
// expression "ä" is no word character, so "Kirjauspäivä\b" never matches.)
const select = (label: string) =>
  screen.getByRole('combobox', { name: new RegExp(`^${label}(\\s|$)`) });

beforeEach(() => {
  jest.mocked(bankStatementsApi.csvPreview).mockResolvedValue(PREVIEW);
  jest.mocked(bankStatementsApi.importCsv).mockResolvedValue({ imported: 2, duplicates: 1, skipped: 1 });
});

test('reads the chosen file and shows the columns guessed, the transactions and the duplicates', async () => {
  renderDialog();
  expect(screen.getByRole('button', { name: /^Tuo \d+ tapahtumaa$/ })).toBeDisabled();

  await pickFile();
  expect(bankStatementsApi.csvPreview).toHaveBeenCalledWith('september', FILE, undefined);
  expect(screen.getByText('Käyttötili.csv')).toBeInTheDocument();

  expect(select('Kirjauspäivä')).toHaveTextContent('Kirjauspäivä');
  expect(select('Määrä')).toHaveTextContent('Määrä');
  // Several columns for one field: the counterparty's account is on either side.
  expect(select('Vastapuolen tili')).toHaveTextContent('Maksunsaaja + Maksaja');
  expect(select('Arkistointitunnus')).toHaveTextContent('–');

  const rows = within(screen.getByRole('table', { name: 'Tuotavat tapahtumat' }));
  expect(rows.getByText('Kioski')).toBeInTheDocument();
  expect(rows.getByText('Asiakas Oy')).toBeInTheDocument();
  expect(within(rows.getByText('Vuokranantaja Oy').closest('tr')!).getByText('Jo tuotu')).toBeInTheDocument();
  expect(screen.getByText(/rivi 2 \(varaus\)/)).toBeInTheDocument();

  // The duplicate is not counted.
  expect(screen.getByRole('button', { name: 'Tuo 2 tapahtumaa' })).toBeEnabled();
});

test('reads the file again with a column chosen by hand', async () => {
  renderDialog();
  await pickFile();

  fireEvent.mouseDown(select('Vastapuoli'));
  fireEvent.click(within(screen.getByRole('listbox')).getByText('Otsikko'));

  await waitFor(() => expect(bankStatementsApi.csvPreview).toHaveBeenCalledTimes(2));
  expect(jest.mocked(bankStatementsApi.csvPreview).mock.calls[1]).toEqual([
    'september',
    FILE,
    { ...PREVIEW.mapping, counterparty: [4, 5] },
  ]);
});

test("says what is missing, and doesn't import without it", async () => {
  renderDialog();
  await pickFile();

  fireEvent.mouseDown(select('Kirjauspäivä'));
  fireEvent.click(within(screen.getByRole('listbox')).getByText('–'));

  expect(await screen.findByText('Valitse kirjauspäivän sarake.')).toBeInTheDocument();
  expect(screen.queryByRole('table', { name: 'Tuotavat tapahtumat' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Tuo \d+ tapahtumaa$/ })).toBeDisabled();
});

test('imports the file with the columns shown and reports the result', async () => {
  const onImported = renderDialog();
  await pickFile();

  fireEvent.click(screen.getByRole('button', { name: 'Tuo 2 tapahtumaa' }));
  await waitFor(() => expect(onImported).toHaveBeenCalledWith({ imported: 2, duplicates: 1, skipped: 1 }));
  expect(bankStatementsApi.importCsv).toHaveBeenCalledWith('september', FILE, PREVIEW.mapping);
});

test("warns when the file is another account's", async () => {
  jest.mocked(bankStatementsApi.csvPreview).mockResolvedValue({ ...PREVIEW, accountMismatch: 'FI5940008000123456' });
  renderDialog();
  await pickFile();
  expect(
    screen.getByText(
      'Tiedosto näyttää olevan tilin FI59 4000 8000 1234 56 tapahtumat, mutta tiliotteen pankkitili on FI14 1009 3000 1234 58.',
    ),
  ).toBeInTheDocument();
});

test('says so when the layout is not known, and shows what the server refuses', async () => {
  jest.mocked(bankStatementsApi.csvPreview).mockResolvedValueOnce({ ...PREVIEW, layout: null });
  renderDialog();
  fireEvent.change(screen.getByLabelText('Valitse tiedosto'), { target: { files: [FILE] } });
  expect(await screen.findByText(/Tiedoston muotoa ei tunnistettu/)).toBeInTheDocument();

  jest.mocked(bankStatementsApi.csvPreview).mockRejectedValueOnce(new Error('The file is not a CSV file'));
  fireEvent.change(screen.getByLabelText('Valitse tiedosto'), { target: { files: [new File(['%PDF'], 'tiliote.pdf')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('The file is not a CSV file');
});
