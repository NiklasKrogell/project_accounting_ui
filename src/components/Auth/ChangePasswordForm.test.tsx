import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import type { AuthContextValue } from '../../types/auth';
import { ChangePasswordForm } from './ChangePasswordForm';

jest.mock('../../auth/AuthContext');

const changePassword = jest.fn();
const logout = jest.fn();

beforeEach(() => {
  changePassword.mockReset().mockResolvedValue(undefined);
  logout.mockReset().mockResolvedValue(undefined);
  jest.mocked(useAuth).mockReturnValue({ changePassword, logout } as unknown as AuthContextValue);
});

const temporary = () => screen.getByLabelText(/^Väliaikainen salasana/);
const next = () => screen.getByLabelText(/^Uusi salasana \(/);
const again = () => screen.getByLabelText(/^Uusi salasana uudelleen/);
const save = () => screen.getByRole('button', { name: 'Tallenna salasana' });
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });

test('saves a new password once it is long enough and entered the same twice', async () => {
  render(<ChangePasswordForm />);
  type(temporary(), 'K7QM-3XPD-9RTW-HV2F');
  expect(save()).toBeDisabled();

  type(next(), 'lyhyt');
  type(again(), 'lyhyt');
  expect(save()).toBeDisabled();

  type(next(), 'oma-salasana-123');
  type(again(), 'oma-salasana-124');
  expect(save()).toBeDisabled();
  // The mismatch is pointed out once the field has been left.
  expect(screen.queryByText('Salasanat eivät täsmää.')).not.toBeInTheDocument();
  fireEvent.blur(again());
  expect(screen.getByText('Salasanat eivät täsmää.')).toBeInTheDocument();

  type(again(), 'oma-salasana-123');
  expect(screen.queryByText('Salasanat eivät täsmää.')).not.toBeInTheDocument();
  fireEvent.click(save());
  await waitFor(() =>
    expect(changePassword).toHaveBeenCalledWith('K7QM-3XPD-9RTW-HV2F', 'oma-salasana-123'),
  );
});

test("shows the backend's error and lets the user try again", async () => {
  changePassword.mockRejectedValue(new Error('Current password is incorrect'));
  render(<ChangePasswordForm />);
  type(temporary(), 'wrong');
  type(next(), 'oma-salasana-123');
  type(again(), 'oma-salasana-123');
  fireEvent.click(save());

  expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
  expect(save()).toBeEnabled();
});

test('offers a way out', () => {
  render(<ChangePasswordForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Kirjaudu ulos' }));
  expect(logout).toHaveBeenCalledTimes(1);
});
