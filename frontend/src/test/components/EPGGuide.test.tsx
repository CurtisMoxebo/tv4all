import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { EPGGuide } from '../../components/EPGGuide';
import { Channel } from '../../types/channel';
import { ChannelEPGResponse } from '../../types/epg';

describe('EPGGuide Component Regression Tests', () => {
  const sampleChannel: Channel = {
    id: 'Arte.fr',
    name: 'Arte',
    group: 'General',
    logo: ''
  };

  const sampleEpgData: ChannelEPGResponse = {
    channelId: 'Arte.fr',
    channelName: 'Arte',
    hasEpg: true,
    current: {
      id: 'p-1',
      channelId: 'Arte.fr',
      title: '28 Minutes',
      desc: 'Le magazine d actualite d Arte',
      category: 'Magazine',
      start: '2026-10-26T19:00:00.000Z',
      stop: '2026-10-26T20:00:00.000Z',
      progress: 45,
      durationMinutes: 60
    },
    upcoming: [
      {
        id: 'p-2',
        channelId: 'Arte.fr',
        title: 'Cinema: Le Grand Bleu',
        desc: 'Film classique',
        category: 'Movie',
        start: '2026-10-26T20:00:00.000Z',
        stop: '2026-10-26T22:15:00.000Z',
        durationMinutes: 135
      }
    ],
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when channel is null', () => {
    const { container } = renderWithProviders(
      <EPGGuide channel={null} token="test-token" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('fetches and displays Live Now program and upcoming show', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => sampleEpgData
      } as Response;
    });

    renderWithProviders(
      <EPGGuide channel={sampleChannel} token="test-token" />
    );

    await waitFor(() => {
      expect(screen.getByText('28 Minutes')).toBeInTheDocument();
      expect(screen.getByText('Cinema: Le Grand Bleu')).toBeInTheDocument();
      expect(screen.getByText('Magazine')).toBeInTheDocument();
    });

    expect(screen.getByTestId('epg-guide')).toBeInTheDocument();
  });

  it('handles empty EPG response gracefully', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          channelId: 'Arte.fr',
          hasEpg: false,
          current: null,
          upcoming: [],
          updatedAt: new Date().toISOString()
        })
      } as Response;
    });

    renderWithProviders(
      <EPGGuide channel={sampleChannel} token="test-token" />
    );

    await waitFor(() => {
      expect(screen.getByText(/No schedule information available/i)).toBeInTheDocument();
    });
  });

  it('handles network error during EPG fetch gracefully', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <EPGGuide channel={sampleChannel} token="test-token" />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/No schedule information available/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('refetches EPG when user clicks the refresh guide button', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleEpgData
    } as Response);

    renderWithProviders(
      <EPGGuide channel={sampleChannel} token="test-token" />
    );

    await waitFor(() => {
      expect(screen.getByText('28 Minutes')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh Guide/i });
    expect(refreshBtn).toBeInTheDocument();

    const callCountBefore = fetchSpy.mock.calls.length;
    fireEvent.click(refreshBtn);

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
  });
});

