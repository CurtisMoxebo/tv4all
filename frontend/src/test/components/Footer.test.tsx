import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { Footer } from '../../components/Footer';

describe('Footer Component Regression Tests', () => {
  it('renders centered copyright text with current year and brand name', () => {
    renderWithProviders(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    const footerElement = screen.getByTestId('app-footer');

    expect(footerElement).toBeInTheDocument();
    expect(footerElement.textContent).toContain(currentYear);
    expect(footerElement.textContent).toContain('tv4all');
    expect(footerElement.textContent).toContain('All rights reserved.');
  });
});
