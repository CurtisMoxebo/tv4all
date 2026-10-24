import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from '../../components/LanguageSelector';
import { renderWithProviders } from '../test-utils';
import i18n from '../../i18n';

describe('LanguageSelector Component Regression Tests', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  it('renders current language button', () => {
    renderWithProviders(<LanguageSelector />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
  });

  it('opens language options dropdown on click', () => {
    renderWithProviders(<LanguageSelector />);
    const trigger = screen.getByRole('button');

    // Initially options are closed
    expect(screen.queryByText('Français')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    // After click, options are displayed
    expect(screen.getAllByText('English').length).toBe(2);
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('switches language and closes dropdown when option is selected', async () => {
    renderWithProviders(<LanguageSelector />);
    fireEvent.click(screen.getByRole('button'));

    const frenchOption = screen.getByText('Français');
    fireEvent.click(frenchOption);

    expect(i18n.language).toBe('fr');
    // Dropdown should be closed
    expect(screen.queryByText('Español')).not.toBeInTheDocument();
  });
});
