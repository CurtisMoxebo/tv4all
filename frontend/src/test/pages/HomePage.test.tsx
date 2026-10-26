import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { HomePage } from '../../pages/HomePage';
import { renderWithProviders } from '../test-utils';

describe('HomePage Regression Tests', () => {
  const sampleChannels = [
    { id: 'France2.fr', name: 'France 2 HD', group: 'General', logo: '' },
    { id: 'France3.fr', name: 'France 3', group: 'General', logo: '' }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => sampleChannels
      } as Response;
    });
  });

  it('renders top navigation header without Manage Channels button', async () => {
    renderWithProviders(<HomePage />, {
      auth: {
        isAuthenticated: true,
        isAdmin: true,
        user: { username: 'tv4alladmin', role: 'admin' }
      }
    });

    // Top header should NOT have "Manage Channels" button (regression check)
    expect(screen.queryByTitle(/Manage Channels/i)).not.toBeInTheDocument();
  });

  it('renders "+ Manage" button in channels sidebar for admin users', async () => {
    renderWithProviders(<HomePage />, {
      auth: {
        isAuthenticated: true,
        isAdmin: true,
        user: { username: 'tv4alladmin', role: 'admin' }
      }
    });

    // Sidebar should have "+ Manage" links for admin
    const manageLinks = screen.getAllByRole('link', { name: /\+ Manage/i });
    expect(manageLinks.length).toBeGreaterThanOrEqual(1);
    expect(manageLinks[0]).toHaveAttribute('href', '/manage-channels');
  });

  it('does NOT render "+ Manage" button for standard viewers', async () => {
    renderWithProviders(<HomePage />, {
      auth: {
        isAuthenticated: true,
        isAdmin: false,
        user: { username: 'tv4all', role: 'user' }
      }
    });

    // Standard user should not see "+ Manage"
    expect(screen.queryByRole('link', { name: /\+ Manage/i })).not.toBeInTheDocument();
  });

  it('loads and renders channels in the channel list', async () => {
    renderWithProviders(<HomePage />, {
      auth: { isAuthenticated: true, isAdmin: false }
    });

    await waitFor(() => {
      expect(screen.getAllByText('France 2 HD').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('France 3').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('updates document.title with app name and channel name when channel is selected', async () => {
    renderWithProviders(<HomePage />, {
      auth: { isAuthenticated: true, isAdmin: false }
    });

    await waitFor(() => {
      expect(screen.getAllByText('France 2 HD').length).toBeGreaterThanOrEqual(1);
    });

    // Select the channel
    const channelCard = screen.getAllByText('France 2 HD')[0];
    fireEvent.click(channelCard);

    expect(document.title).toBe('TV4ALL - France 2 HD');
  });

  it('shows "No channels found" empty state when search query matches nothing', async () => {
    renderWithProviders(<HomePage />, {
      auth: { isAuthenticated: true, isAdmin: false }
    });

    await waitFor(() => {
      expect(screen.getAllByText('France 2 HD').length).toBeGreaterThanOrEqual(1);
    });

    // Enter non-matching query in search input
    const searchInputs = screen.getAllByPlaceholderText(/Search channels by name or ID/i);
    fireEvent.change(searchInputs[0], { target: { value: 'NonExistentXYZChannel' } });

    await waitFor(() => {
      expect(screen.getAllByText(/No channels found/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('toggles mobile drawer open and closed when drawer trigger is clicked', async () => {
    const { container } = renderWithProviders(<HomePage />, {
      auth: { isAuthenticated: true, isAdmin: false }
    });

    await waitFor(() => {
      expect(screen.getAllByText('France 2 HD').length).toBeGreaterThanOrEqual(1);
    });

    const drawerTrigger = screen.getByLabelText('Toggle channels drawer');
    expect(drawerTrigger).toBeInTheDocument();

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('-translate-x-full');

    // Click to open drawer
    fireEvent.click(drawerTrigger);
    expect(aside).toHaveClass('translate-x-0');

    // Close button appears in mobile drawer
    const closeBtn = screen.getByLabelText('Close channels drawer');
    expect(closeBtn).toBeInTheDocument();

    // Click close button
    fireEvent.click(closeBtn);
    expect(aside).toHaveClass('-translate-x-full');
  });
});
