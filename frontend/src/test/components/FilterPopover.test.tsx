import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { FilterPopover, SortOrder } from '../../components/FilterPopover';
import { renderWithProviders } from '../test-utils';

describe('FilterPopover Component Regression Tests', () => {
  const defaultProps = {
    categories: ['General', 'News', 'Sports'],
    selectedCategory: 'all',
    onSelectCategory: vi.fn(),
    channelCounts: { General: 4, News: 2, Sports: 1 },
    totalChannelsCount: 7,
    sortBy: 'default' as SortOrder,
    onSelectSortBy: vi.fn()
  };

  it('renders filter trigger button', () => {
    renderWithProviders(<FilterPopover {...defaultProps} />);
    const button = screen.getByTitle('Filter channels');
    expect(button).toBeInTheDocument();
  });

  it('opens filter dialog on click', () => {
    renderWithProviders(<FilterPopover {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Filter channels'));

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
  });

  it('triggers onSelectCategory when a category option is clicked', () => {
    const handleSelectCategory = vi.fn();
    renderWithProviders(
      <FilterPopover {...defaultProps} onSelectCategory={handleSelectCategory} />
    );

    fireEvent.click(screen.getByTitle('Filter channels'));
    fireEvent.click(screen.getByText('News'));

    expect(handleSelectCategory).toHaveBeenCalledWith('News');
  });

  it('triggers onSelectSortBy when sorting option is changed', () => {
    const handleSelectSort = vi.fn();
    renderWithProviders(
      <FilterPopover {...defaultProps} onSelectSortBy={handleSelectSort} />
    );

    fireEvent.click(screen.getByTitle('Filter channels'));
    const sortBtn = screen.getByRole('button', { name: 'A → Z' });
    fireEvent.click(sortBtn);

    expect(handleSelectSort).toHaveBeenCalledWith('asc');
  });
});
