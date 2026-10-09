import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '../i18n';
import { useAuth } from '../auth/AuthContext';
import type { AuthContextValue } from '../types/auth';
import ProtectedRoute from './ProtectedRoute';

jest.mock('../auth/AuthContext');

function renderAt(user: { mustChangePassword: boolean } | null) {
  jest.mocked(useAuth).mockReturnValue({ user } as unknown as AuthContextValue);
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/settings" element={<p>the app</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test('sends a logged-out visitor to the login page', () => {
  renderAt(null);
  expect(screen.getByText('login page')).toBeInTheDocument();
});

test('lets a logged-in user through', () => {
  renderAt({ mustChangePassword: false });
  expect(screen.getByText('the app')).toBeInTheDocument();
});

test('shows a user on a temporary password nothing but the password change', () => {
  renderAt({ mustChangePassword: true });
  expect(screen.getByRole('heading', { name: 'Aseta oma salasana' })).toBeInTheDocument();
  expect(screen.queryByText('the app')).not.toBeInTheDocument();
});
