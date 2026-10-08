import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18n from '../../../i18n';
import { useAuth } from '../../../auth/AuthContext';
import type { AuthContextValue } from '../../../types/auth';
import { GeneralSettings } from './GeneralSettings';

jest.mock('../../../auth/AuthContext');

const updateUserSettings = jest.fn();

function mockAuth() {
  jest.mocked(useAuth).mockReturnValue({
    settings: { language: 'fi' },
    updateUserSettings,
  } as unknown as AuthContextValue);
}

function pickLanguage(name: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Kieli' }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(name));
}

test('saves the chosen language to the user only when Save is pressed', async () => {
  mockAuth();
  updateUserSettings.mockResolvedValue(undefined);
  render(<GeneralSettings />);

  const save = screen.getByRole('button', { name: 'Tallenna' });
  expect(save).toBeDisabled();

  pickLanguage('English');
  // Choosing is only a draft: nothing is saved or applied yet.
  expect(updateUserSettings).not.toHaveBeenCalled();
  expect(i18n.language).toBe('fi');
  expect(save).toBeEnabled();

  fireEvent.click(save);
  await waitFor(() => expect(updateUserSettings).toHaveBeenCalledWith({ language: 'en' }));
});

test('shows the error when saving fails', async () => {
  mockAuth();
  updateUserSettings.mockRejectedValue(new Error('Tallennus epäonnistui'));
  render(<GeneralSettings />);

  pickLanguage('English');
  fireEvent.click(screen.getByRole('button', { name: 'Tallenna' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Tallennus epäonnistui');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
