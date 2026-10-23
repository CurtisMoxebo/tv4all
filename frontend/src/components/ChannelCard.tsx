import React, { useState } from 'react';
import { Channel } from '../types/channel';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: (channel: Channel) => void;
  searchQuery?: string;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isSelected,
  onSelect,
  searchQuery = ''
}) => {
  const [imageError, setImageError] = useState(false);

  // Highlight matching text in channel name when search query is active
  const renderChannelName = (name: string, query?: string) => {
    if (!query || !query.trim()) return name;
    const q = query.trim();
    const matchIndex = name.toLowerCase().indexOf(q.toLowerCase());
    if (matchIndex === -1) return name;

    const before = name.slice(0, matchIndex);
    const match = name.slice(matchIndex, matchIndex + q.length);
    const after = name.slice(matchIndex + q.length);

    return (
      <>
        {before}
        <span className="text-indigo-400 font-bold bg-indigo-500/25 px-0.5 rounded">
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center space-x-3 cursor-pointer group ${
        isSelected
          ? 'bg-[#15233e] border-indigo-500 shadow-md shadow-indigo-950/40'
          : 'bg-[#0d1527] border-[#1e2c47] hover:border-slate-600 hover:bg-[#121c33]'
      }`}
    >
      {/* Channel Logo / Fallback Icon */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#080d1a] border border-[#1e2c47] flex items-center justify-center overflow-hidden shrink-0 p-1">
        {channel.logo && !imageError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-[11px] uppercase bg-[#0c1220]">
            {channel.name.slice(0, 2)}
          </div>
        )}
      </div>

      {/* Channel Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1.5">
          <h3
            className={`text-xs sm:text-[13px] font-semibold truncate ${
              isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {renderChannelName(channel.name, searchQuery)}
          </h3>
          {isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 truncate">
          {channel.group || 'General'}
        </p>
      </div>

      {/* Play Action Indicator */}
      <div className="shrink-0 text-slate-500 group-hover:text-white transition-colors">
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  );
};

export default ChannelCard;

