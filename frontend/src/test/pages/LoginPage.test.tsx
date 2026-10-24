import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { LoginPage } from '../../pages/LoginPage';
import { renderWithProviders } from '../test-utils';

describe('LoginPage Component Regression Tests', () => {
  it('renders username, password inputs and sign in button', () => {
    renderWithProviders(<LoginPage />, {
      auth: { isAuthenticated: false }
    });

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('displays error message when login fails', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid username or password'
    });

    renderWithProviders(<LoginPage />, {
      auth: {
        isAuthenticated: false,
        login: mockLogin
      }
    });

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'wronguser' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpass' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    const errorBanner = await screen.findByText('Invalid username or password');
    expect(errorBanner).toBeInTheDocument();
    expect(mockLogin).toHaveBeenCalledWith('wronguser', 'wrongpass');
  });

  it('calls login with entered credentials on submission', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });

    renderWithProviders(<LoginPage />, {
      auth: {
        isAuthenticated: false,
        login: mockLogin
      }
    });

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'tv4alladmin' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: '123123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(mockLogin).toHaveBeenCalledWith('tv4alladmin', '123123');
  });
});
