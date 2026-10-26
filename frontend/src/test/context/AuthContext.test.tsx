import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

describe('AuthContext Regression Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('initializes with unauthenticated state when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
  });

  it('restores admin user from localStorage', async () => {
    localStorage.setItem('tv4all_token', 'valid-admin-token');
    localStorage.setItem(
      'tv4all_user',
      JSON.stringify({ username: 'tv4alladmin', role: 'admin' })
    );

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: 'tv4alladmin', role: 'admin' } })
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.user?.username).toBe('tv4alladmin');
    });
  });

  it('clears state and localStorage on logout', async () => {
    localStorage.setItem('tv4all_token', 'token-to-clear');
    localStorage.setItem(
      'tv4all_user',
      JSON.stringify({ username: 'tv4all', role: 'user' })
    );

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { username: 'tv4all', role: 'user' } })
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
    expect(localStorage.getItem('tv4all_token')).toBe(null);
    expect(localStorage.getItem('tv4all_user')).toBe(null);
  });

  it('throws error when useAuth is called outside an AuthProvider', () => {
    // Suppress React error boundary log in test runner
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    consoleError.mockRestore();
  });

  it('automatically logs out when initial /api/auth/me token verification fails', async () => {
    localStorage.setItem('tv4all_token', 'expired-token');
    localStorage.setItem(
      'tv4all_user',
      JSON.stringify({ username: 'tv4all', role: 'user' })
    );

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBe(null);
    });
  });

  it('returns failure result and error message on failed login', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid username or password' })
    } as Response);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login('baduser', 'badpass');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid username or password');
    expect(result.current.isAuthenticated).toBe(false);
  });
});
