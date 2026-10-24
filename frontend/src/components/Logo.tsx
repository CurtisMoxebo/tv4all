import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'lg',
  showText = true
}) => {
  const iconSizes = {
    sm: { w: 28, h: 22, font: 'text-xl' },
    md: { w: 36, h: 28, font: 'text-2xl' },
    lg: { w: 44, h: 34, font: 'text-3xl' },
    xl: { w: 56, h: 44, font: 'text-4xl' }
  };

  const current = iconSizes[size];

  return (
    <div className={`inline-flex items-center justify-center space-x-3 select-none text-white ${className}`}>
      {/* Sleek Minimalist TV & Broadcast Stream Icon */}
      <svg
        width={current.w}
        height={current.h}
        viewBox="0 0 46 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* TV Outer Display Frame */}
        <rect
          x="2"
          y="2"
          width="42"
          height="28"
          rx="6"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="#000000"
        />
        {/* TV Stand / Pedestal */}
        <path
          d="M17 30L15 34.5H31L29 30"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Play Streaming Triangle */}
        <path
          d="M16 10L26 16L16 22V10Z"
          fill="currentColor"
        />
        {/* Inner Broadcast Pulse Wave */}
        <path
          d="M28 11.5C29.8 13.2 30.8 14.7 30.8 16C30.8 17.3 29.8 18.8 28 20.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Outer Broadcast Pulse Wave */}
        <path
          d="M32 8.5C35 11 36.5 13.5 36.5 16C36.5 18.5 35 21 32 23.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* Wordmark */}
      {showText && (
        <span className={`font-black tracking-tight text-white ${current.font}`}>
          TV<span className="text-neutral-400">4</span>ALL
        </span>
      )}
    </div>
  );
};

export default Logo;

