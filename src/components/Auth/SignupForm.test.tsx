import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import type { AuthContextValue } from '../../types/auth';
import { SignupForm } from './SignupForm';

jest.mock('../../auth/AuthContext');

const signup = jest.fn();

beforeEach(() => {
  signup.mockReset().mockResolvedValue(undefined);
  jest.mocked(useAuth).mockReturnValue({ signup } as unknown as AuthContextValue);
});

const renderForm = () =>
  render(
    <MemoryRouter>
      <SignupForm />
    </MemoryRouter>,
  );

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => screen.getByRole('button', { name: 'Luo tili' });

function fillIn() {
  type(/^Etunimi/, 'Anna');
  type(/^Sukunimi/, 'Virtanen');
  type(/^Sähköposti/, 'anna@example.com');
  type(/^Salasana/, 'oma-salasana-123');
}

test('asks for the person only, not for a company', async () => {
  renderForm();
  expect(screen.getAllByRole('textbox')).toHaveLength(3);
  expect(screen.queryByLabelText(/Yrityksen nimi/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Y-tunnus/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Laskutus/)).not.toBeInTheDocument();

  fillIn();
  fireEvent.click(submit());
  await waitFor(() =>
    expect(signup).toHaveBeenCalledWith({
      firstName: 'Anna',
      lastName: 'Virtanen',
      email: 'anna@example.com',
      password: 'oma-salasana-123',
    }),
  );
});

test("shows the backend's error and lets the user try again", async () => {
  signup.mockRejectedValue(new Error('An account with that email already exists'));
  renderForm();
  fillIn();
  fireEvent.click(submit());

  expect(await screen.findByRole('alert')).toHaveTextContent('An account with that email already exists');
  expect(submit()).toBeEnabled();
});
