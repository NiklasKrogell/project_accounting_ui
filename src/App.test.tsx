import { render, screen } from '@testing-library/react';
import App from './App';

// With no backend reachable, /api/auth/me rejects and the app settles on the
// logged-out view. The email field's label is language-independent enough to
// assert on (matches both the Finnish and English translations).
test('renders the login screen when logged out', async () => {
  render(<App />);
  expect(await screen.findByLabelText(/email|sähköposti/i)).toBeInTheDocument();
});
