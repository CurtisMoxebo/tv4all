import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Channel } from '../types/channel';
import { API_ENDPOINTS } from '../config/api';
import { Logo } from './Logo';

interface VideoPlayerProps {
  channel: Channel | null;
  token: string | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel, token }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Initially or when no channel is selected, show nothing
    if (!channel || !token) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const streamUrl = `${API_ENDPOINTS.STREAM(channel.id)}?token=${encodeURIComponent(token)}`;
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {
          // Autoplay was prevented by browser policy (user interaction needed)
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Network error, attempting recovery...');
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, attempting recovery...');
              hls?.recoverMediaError();
              break;
            default:
              console.error('[HLS] Unrecoverable error:', data);
              setError('Failed to play stream. Upstream broadcast may be offline.');
              setIsLoading(false);
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari / iOS)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
    } else {
      // Fallback direct stream source
      video.src = streamUrl;
      video.load();
    }

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError('Unable to load channel stream.');
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);

      if (hls) {
        hls.destroy();
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [channel, token]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#1e2c47] shadow-2xl">
      <video
        ref={videoRef}
        controls={!!channel}
        playsInline
        className="w-full h-full object-contain bg-black"
      />

      {/* When no channel is selected: display logo at center */}
      {!channel && (
        <div className="absolute inset-0 bg-black flex items-center justify-center select-none pointer-events-none">
          <Logo size="xl" />
        </div>
      )}

      {/* Loading overlay when buffering or switching channels */}
      {channel && isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-3 border-slate-600 border-t-white rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-medium text-slate-300">
            Buffering live stream...
          </span>
        </div>
      )}

      {/* Stream error overlay */}
      {channel && error && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center mb-3 text-red-400 text-xl font-bold">
            !
          </div>
          <p className="text-sm font-semibold text-red-400 mb-1">{error}</p>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            The stream source might be temporarily offline or unreachable from the IPTV relay.
          </p>
        </div>
      )}

      {/* Channel info banner on top left when active */}
      {channel && (
        <div className="absolute top-3 left-3 flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-slate-700/60 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            LIVE
          </span>
          <span className="text-xs text-slate-400 font-medium">|</span>
          <span className="text-xs font-semibold text-slate-200">
            {channel.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
