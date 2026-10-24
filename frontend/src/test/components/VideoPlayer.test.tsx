import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { VideoPlayer } from '../../components/VideoPlayer';
import { renderWithProviders } from '../test-utils';
import { Channel } from '../../types/channel';

describe('VideoPlayer Component Regression Tests', () => {
  it('displays logo placeholder at center when no channel is selected', () => {
    const { container } = renderWithProviders(<VideoPlayer channel={null} token={null} />);
    expect(container.textContent).toContain('tv4all');
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
});
