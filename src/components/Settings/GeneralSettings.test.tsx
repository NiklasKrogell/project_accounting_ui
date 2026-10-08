import { fireEvent, render, screen, within } from '@testing-library/react';
import i18n, { changeLanguage } from '../../i18n';
import { GeneralSettings } from './GeneralSettings';

afterEach(() => {
  changeLanguage('fi');
  localStorage.clear();
});

test('changes and persists the app language', () => {
  render(<GeneralSettings />);
  expect(screen.getByRole('heading', { name: 'Yleiset asetukset' })).toBeInTheDocument();

  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Kieli' }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText('English'));

  expect(i18n.language).toBe('en');
  expect(localStorage.getItem('lang')).toBe('en');
  expect(screen.getByRole('heading', { name: 'General settings' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('English');
});
