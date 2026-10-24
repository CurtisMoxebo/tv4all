import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AuthContext, AuthContextType } from '../context/AuthContext';

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  router?: MemoryRouterProps;
  auth?: Partial<AuthContextType>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { router: routerOption, auth: authOption, ...renderOptions } = options;

  const defaultAuth = {
    user: { username: 'tv4alladmin', role: 'admin' },
    token: 'mock-admin-token',
    isAuthenticated: true,
    isAdmin: true,
    login: async () => ({ success: true }),
    logout: () => {}
  };

  const mergedAuth = { ...defaultAuth, ...authOption };

  const authValue: AuthContextType = {
    user: mergedAuth.user,
    token: mergedAuth.isAuthenticated ? (mergedAuth.token || 'mock-token') : null,
    isAuthenticated: mergedAuth.isAuthenticated,
    isAdmin: mergedAuth.isAdmin,
    login: mergedAuth.login,
    logout: mergedAuth.logout
  };

  const router = routerOption || { initialEntries: ['/'] };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter {...router}>
            {children}
          </MemoryRouter>
        </AuthContext.Provider>
      </I18nextProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
