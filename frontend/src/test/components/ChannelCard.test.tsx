import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelCard } from '../../components/ChannelCard';
import { Channel } from '../../types/channel';

describe('ChannelCard Component Regression Tests', () => {
  const sampleChannel: Channel = {
    id: 'France2.fr',
    name: 'France 2 HD',
    logo: 'https://example.com/france2.png',
    group: 'General'
  };

  it('renders channel name and group category', () => {
    render(
      <ChannelCard
        channel={sampleChannel}
        isSelected={false}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText('France 2 HD')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('falls back to "General" if group is empty', () => {
    const channelWithoutGroup: Channel = {
      ...sampleChannel,
      group: ''
    };

    render(
      <ChannelCard
        channel={channelWithoutGroup}
        isSelected={false}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('renders channel logo image when available', () => {
    render(
      <ChannelCard
        channel={sampleChannel}
        isSelected={false}
        onSelect={() => {}}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/france2.png');
    expect(img).toHaveAttribute('alt', 'France 2 HD');
  });

  it('falls back to initial characters when channel has no logo', () => {
    const channelNoLogo: Channel = {
      ...sampleChannel,
      logo: ''
    };

    render(
      <ChannelCard
        channel={channelNoLogo}
        isSelected={false}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText('Fr')).toBeInTheDocument();
  });

  it('calls onSelect with channel object when clicked', () => {
    const handleSelect = vi.fn();
    render(
      <ChannelCard
        channel={sampleChannel}
        isSelected={false}
        onSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(sampleChannel);
  });

  it('highlights matching search query in channel name', () => {
    render(
      <ChannelCard
        channel={sampleChannel}
        isSelected={false}
        onSelect={() => {}}
        searchQuery="France"
      />
    );

    const highlighted = screen.getByText('France');
    expect(highlighted).toHaveClass('text-indigo-400');
  });
});
