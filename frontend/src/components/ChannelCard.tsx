import React, { useState } from 'react';
import { Channel } from '../types/channel';

interface ChannelCardProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: (channel: Channel) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isSelected,
  onSelect
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center space-x-3.5 cursor-pointer group ${
        isSelected
          ? 'bg-[#15233e] border-indigo-500 shadow-lg shadow-indigo-950/50'
          : 'bg-[#0d1527] border-[#1e2c47] hover:border-slate-600 hover:bg-[#121c33]'
      }`}
    >
      {/* Channel Logo / Fallback Icon */}
      <div className="w-12 h-12 rounded-lg bg-[#080d1a] border border-[#1e2c47] flex items-center justify-center overflow-hidden shrink-0 p-1">
        {channel.logo && !imageError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase bg-[#0c1220]">
            {channel.name.slice(0, 2)}
          </div>
        )}
      </div>

      {/* Channel Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3
            className={`text-sm font-semibold truncate ${
              isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {channel.name}
          </h3>
          {isSelected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {channel.group || 'General'}
        </p>
      </div>

      {/* Play Action Indicator */}
      <div className="shrink-0 text-slate-500 group-hover:text-white transition-colors">
        <svg
          className="w-5 h-5"
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

