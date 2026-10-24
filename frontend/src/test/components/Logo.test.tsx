import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Logo } from '../../components/Logo';

describe('Logo Component Regression Tests', () => {
  it('renders the brand title "TV4ALL" and SVG display', () => {
    const { container } = render(<Logo size="md" />);
    expect(container.textContent).toContain('TV4ALL');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('hides the text when showText is false', () => {
    const { container } = render(<Logo size="md" showText={false} />);
    expect(container.textContent).not.toContain('TV4ALL');
  });

  it('renders across various size variants (sm, md, lg, xl)', () => {
    const { rerender, container } = render(<Logo size="sm" />);
    expect(container.textContent).toContain('TV4ALL');

    rerender(<Logo size="lg" />);
    expect(container.textContent).toContain('TV4ALL');

    rerender(<Logo size="xl" />);
    expect(container.textContent).toContain('TV4ALL');
  });
});
