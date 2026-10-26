import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../../components/VideoPlayer';
import { renderWithProviders } from '../test-utils';
import { Channel } from '../../types/channel';

describe('VideoPlayer Component Regression Tests', () => {
  it('displays logo placeholder at center when no channel is selected', () => {
    const { container } = renderWithProviders(<VideoPlayer channel={null} token={null} />);
    expect(container.textContent).toContain('TV4ALL');
  });

  it('renders video element and live indicator banner when channel is selected', () => {
    const channel: Channel = {
      id: 'France2.fr',
      name: 'France 2 HD',
      logo: '',
      group: 'General'
    };

    const { container } = renderWithProviders(
      <VideoPlayer channel={channel} token="test-token" />
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('France 2 HD')).toBeInTheDocument();
  });

  it('renders live viewers count badge on top right when channel is selected', () => {
    const channel: Channel = {
      id: 'France2.fr',
      name: 'France 2 HD',
      logo: '',
      group: 'General'
    };

    renderWithProviders(
      <VideoPlayer channel={channel} token="test-token" />
    );

    const badge = screen.getByTestId('live-viewers-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/1\s+viewer/i);
  });

  it('updates live viewers count badge when stream status returns multiple viewers', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        active: true,
        channelId: 'France2.fr',
        viewersCount: 7
      })
    } as Response);

    const channel: Channel = {
      id: 'France2.fr',
      name: 'France 2 HD',
      logo: '',
      group: 'General'
    };

    renderWithProviders(
      <VideoPlayer channel={channel} token="test-token" />
    );

    const badge = screen.getByTestId('live-viewers-badge');
    expect(badge).toBeInTheDocument();

    await waitFor(() => {
      expect(badge.textContent).toMatch(/7\s+viewers/i);
    }, { timeout: 2500 });
  });

  it('displays stream error overlay and retry button when video error event fires', () => {
    const channel: Channel = {
      id: 'France2.fr',
      name: 'France 2 HD',
      logo: '',
      group: 'General'
    };

    const { container } = renderWithProviders(
      <VideoPlayer channel={channel} token="test-token" />
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();

    // Mock video.error and dispatch error event
    Object.defineProperty(video, 'error', {
      value: { code: 4 },
      writable: true
    });
    fireEvent.error(video!);

    expect(screen.getByText(/Stream format not supported or unreachable/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    expect(retryBtn).toBeInTheDocument();

    // Clicking retry resets error state
    fireEvent.click(retryBtn);
    expect(screen.queryByText(/Stream format not supported or unreachable/i)).not.toBeInTheDocument();
  });
});
