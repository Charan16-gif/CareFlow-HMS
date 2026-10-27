import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';

test('renders CareFlow brand heading and navigation', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/CareFlow/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

test('renders LoginPage with credentials inputs and portal elements', () => {
  render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
  expect(screen.getByText(/Sign in to CareFlow/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Username or Email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Sign In to Portal/i })).toBeInTheDocument();
});

