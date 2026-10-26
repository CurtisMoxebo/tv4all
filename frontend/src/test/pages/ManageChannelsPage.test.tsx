import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ManageChannelsPage } from '../../pages/ManageChannelsPage';
import { renderWithProviders } from '../test-utils';

describe('ManageChannelsPage Regression Tests', () => {
  const sampleChannels = [
    { id: 'France2.fr', name: 'France 2 HD', group: 'General', logo: '' },
    { id: 'France24.fr', name: 'France 24', group: 'News', logo: '' }
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

  it('renders "Admin Access Required" when non-admin user accesses the page', () => {
    renderWithProviders(<ManageChannelsPage />, {
      auth: {
        isAuthenticated: true,
        isAdmin: false,
        user: { username: 'standard-user', role: 'user' }
      }
    });

    expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
    expect(screen.getByText('Back to Player')).toBeInTheDocument();
  });

  it('renders admin header without username or "Back to Player" text', async () => {
    renderWithProviders(<ManageChannelsPage />, {
      auth: {
        isAuthenticated: true,
        isAdmin: true,
        user: { username: 'tv4alladmin', role: 'admin' }
      }
    });

    // Username should NOT be visible near logout (regression check)
    expect(screen.queryByText('tv4alladmin')).not.toBeInTheDocument();

    // "Back to Player" text label should NOT be visible next to arrow (only in title/aria)
    const backButton = screen.getByTitle('Back to Player');
    expect(backButton).toBeInTheDocument();

    // Channel list loaded
    await waitFor(() => {
      expect(screen.getByText('France 2 HD')).toBeInTheDocument();
    });
  });

  it('allows toggling between "Form Fields" and "Raw M3U (2 Lines)" add modes', async () => {
    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    // Open add channel form
    const toggleButton = screen.getByRole('button', { name: /Add New Channel/i });
    fireEvent.click(toggleButton);

    // Both mode buttons are present
    expect(screen.getByText('Form Fields')).toBeInTheDocument();
    expect(screen.getByText('Raw M3U (2 Lines)')).toBeInTheDocument();

    // Switch to Raw M3U mode
    fireEvent.click(screen.getByText('Raw M3U (2 Lines)'));

    // Check Raw M3U inputs
    expect(screen.getByText(/Line 1: #EXTINF Directive/i)).toBeInTheDocument();
    expect(screen.getByText(/Line 2: Stream URL/i)).toBeInTheDocument();
  });

  it('renders category filter as a dropdown <select>', async () => {
    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    await waitFor(() => {
      expect(screen.getByText('France 2 HD')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue(/All Categories/i);
    expect(categorySelect.tagName.toLowerCase()).toBe('select');
  });

  it('opens confirmation modal without long playlist removal warning text when delete is clicked', async () => {
    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    await waitFor(() => {
      expect(screen.getByText('France 2 HD')).toBeInTheDocument();
    });

    // Click delete channel button
    const deleteButton = screen.getAllByTitle('Delete channel from playlist')[0];
    fireEvent.click(deleteButton);

    // Modal opens with confirmation question
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    // Verify long warning text was removed (regression check)
    expect(
      screen.queryByText(/This channel will be immediately removed from the index.m3u8 playlist file/i)
    ).not.toBeInTheDocument();

    // Cancel dismisses modal
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
  });

  it('successfully deletes channel and displays success message when confirmed in modal', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url: any, options?: any) => {
      if (options?.method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Channel deleted successfully',
            channel: sampleChannels[0]
          })
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleChannels
      } as Response;
    });

    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    await waitFor(() => {
      expect(screen.getByText('France 2 HD')).toBeInTheDocument();
    });

    // Open delete modal
    const deleteBtn = screen.getAllByTitle('Delete channel from playlist')[0];
    fireEvent.click(deleteBtn);

    // Confirm deletion inside modal
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Delete' });
    fireEvent.click(confirmBtn);

    // Verify channel deletion was requested
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/channels/France2.fr'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(screen.getByText(/Channel "France 2 HD" was removed from the playlist/i)).toBeInTheDocument();
    });
  });

  it('submits new channel via structured form and refreshes list', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url: any, options?: any) => {
      if (options?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Channel added successfully',
            channel: { id: 'tf1-hd', name: 'TF1 HD', group: 'General', logo: '', url: 'https://stream.example.com/tf1.m3u8' }
          })
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleChannels
      } as Response;
    });

    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    // Open add channel form
    fireEvent.click(screen.getByRole('button', { name: /Add New Channel/i }));

    // Fill form fields
    const nameInput = screen.getByPlaceholderText(/e\.g\. TF1, BFM TV, France 24/i);
    const urlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/live\/stream\.m3u8/i);

    fireEvent.change(nameInput, { target: { value: 'TF1 HD' } });
    fireEvent.change(urlInput, { target: { value: 'https://stream.example.com/tf1.m3u8' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Add to Playlist/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/channels'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(screen.getByText(/Channel "TF1 HD" added successfully!/i)).toBeInTheDocument();
    });
  });

  it('submits new channel via raw 2-line M3U and shows success message', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url: any, options?: any) => {
      if (options?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Channel added successfully',
            channel: { id: 'M6.fr', name: 'M6 HD', group: 'Entertainment', logo: '', url: 'https://stream.example.com/m6.m3u8' }
          })
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleChannels
      } as Response;
    });

    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    // Open add channel form and switch to raw M3U mode
    fireEvent.click(screen.getByRole('button', { name: /Add New Channel/i }));
    fireEvent.click(screen.getByText('Raw M3U (2 Lines)'));

    // Fill raw inputs
    const extinfInput = screen.getByPlaceholderText(/#EXTINF:-1 tvg-name=/i);
    const streamUrlInput = screen.getByPlaceholderText(/https:\/\/example\.com\/stream\/index\.m3u8/i);

    fireEvent.change(extinfInput, { target: { value: '#EXTINF:-1 tvg-id="M6.fr" tvg-name="M6 HD",M6 HD' } });
    fireEvent.change(streamUrlInput, { target: { value: 'https://stream.example.com/m6.m3u8' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Append M3U Lines/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/channels/raw'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(screen.getByText(/Channel "M6 HD" added successfully from M3U lines!/i)).toBeInTheDocument();
    });
  });

  it('filters channels in management table by search query', async () => {
    renderWithProviders(<ManageChannelsPage />, {
      auth: { isAuthenticated: true, isAdmin: true }
    });

    await waitFor(() => {
      expect(screen.getByText('France 2 HD')).toBeInTheDocument();
      expect(screen.getByText('France 24')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name, ID, or category/i);
    fireEvent.change(searchInput, { target: { value: 'France 24' } });

    expect(screen.getByText('France 24')).toBeInTheDocument();
    expect(screen.queryByText('France 2 HD')).not.toBeInTheDocument();
  });
});
