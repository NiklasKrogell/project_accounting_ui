import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// With no backend reachable, /api/auth/me rejects and the app settles on the
// logged-out view, redirecting from "/" to "/login". The email field's label
// is language-independent enough to assert on (matches both the Finnish and
// English translations).
test('renders the login screen when logged out', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByLabelText(/email|sähköposti/i)).toBeInTheDocument();
});
