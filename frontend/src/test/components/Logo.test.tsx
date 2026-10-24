import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Logo } from '../../components/Logo';

describe('Logo Component Regression Tests', () => {
  it('renders the brand title "tv4all" and SVG display', () => {
    const { container } = render(<Logo size="md" />);
    expect(container.textContent).toContain('tv4all');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('hides the text when showText is false', () => {
    const { container } = render(<Logo size="md" showText={false} />);
    expect(container.textContent).not.toContain('tv4all');
  });

  it('renders across various size variants (sm, md, lg, xl)', () => {
    const { rerender, container } = render(<Logo size="sm" />);
    expect(container.textContent).toContain('tv4all');

    rerender(<Logo size="lg" />);
    expect(container.textContent).toContain('tv4all');

    rerender(<Logo size="xl" />);
    expect(container.textContent).toContain('tv4all');
  });
});
