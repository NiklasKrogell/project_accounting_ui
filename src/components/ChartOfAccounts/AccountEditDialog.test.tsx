import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '../../i18n';
import { accountsApi } from '../../api/accounts';
import type { Account } from '../../types/account';
import { AccountEditDialog } from './AccountEditDialog';

jest.mock('../../api/accounts');

const sales = (defaultVatRate: number | null): Account => ({
  id: 'sales',
  number: '3000',
  name: 'Myynti',
  accountGroupId: null,
  defaultVatRate,
  createdAt: '',
  updatedAt: '',
});

function renderDialog(defaultVatRate: number | null, vatRegistered = true) {
  render(
    <AccountEditDialog
      account={sales(defaultVatRate)}
      groups={[]}
      vatRegistered={vatRegistered}
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
}

const vatField = () => screen.getByLabelText('Oletus-ALV-%');

function pickDefaultVat(label: string) {
  fireEvent.mouseDown(vatField());
  fireEvent.click(within(screen.getByRole('listbox')).getByText(label));
}

// The PUT replaces the whole account, so the default VAT rate is sent along
// with the rest of it.
async function savedDefaultVat() {
  fireEvent.click(screen.getByRole('button', { name: 'Tallenna' }));
  await waitFor(() => expect(accountsApi.update).toHaveBeenCalledTimes(1));
  const [id, input] = jest.mocked(accountsApi.update).mock.calls[0];
  expect(id).toBe('sales');
  expect(input).toMatchObject({ number: '3000', name: 'Myynti', accountGroupId: null });
  return input.defaultVatRate;
}

describe('AccountEditDialog', () => {
  it('offers the Finnish VAT rates and saves the one picked', async () => {
    renderDialog(null);
    fireEvent.mouseDown(vatField());
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Ei oletusta',
      '25,5 %',
      '13,5 %',
      '10 %',
      '0 %',
    ]);
    fireEvent.click(options[1]);
    expect(await savedDefaultVat()).toBe(25.5);
  });

  it('saves 0 % as a default of its own', async () => {
    renderDialog(25.5);
    expect(vatField()).toHaveTextContent(/^25,5 %$/);
    pickDefaultVat('0 %');
    expect(await savedDefaultVat()).toBe(0);
  });

  it('clears the default', async () => {
    renderDialog(0);
    expect(vatField()).toHaveTextContent(/^0 %$/);
    pickDefaultVat('Ei oletusta');
    expect(await savedDefaultVat()).toBeNull();
  });

  it('greys the default out for a company that is not VAT-registered, and keeps it', async () => {
    renderDialog(13.5, false);
    expect(vatField()).toHaveAttribute('aria-disabled', 'true');
    expect(vatField()).toHaveTextContent(/^13,5 %$/);
    expect(screen.getByText(/ei ole arvonlisäverovelvollinen/)).toBeInTheDocument();

    // The rest of the account can still be edited; the default goes back as it was.
    fireEvent.change(screen.getByLabelText(/^Tilin nimi/), { target: { value: 'Myynti kotimaa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tallenna' }));
    await waitFor(() =>
      expect(accountsApi.update).toHaveBeenCalledWith('sales', {
        number: '3000',
        name: 'Myynti kotimaa',
        accountGroupId: null,
        defaultVatRate: 13.5,
      }),
    );
  });
});
