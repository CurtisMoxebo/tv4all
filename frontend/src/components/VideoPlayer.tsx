import React, { useEffect, useRef, useState } from 'react';
import mpegts from 'mpegts.js';
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
    let mpegtsPlayer: any = null;
    let hlsPlayer: Hls | null = null;

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser restricts unmuted autoplay, mute and resume so video renders immediately
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    if (mpegts.isSupported()) {
      try {
        mpegtsPlayer = mpegts.createPlayer(
          {
            type: 'm2ts',
            isLive: true,
            url: streamUrl,
            cors: true
          },
          {
            enableWorker: false,
            lazyLoad: false,
            liveBufferLatencyChasing: true,
            liveBufferLatencyMaxLatency: 3.0,
            liveBufferLatencyMinRemain: 0.5,
            enableStashBuffer: false,
            autoCleanupSourceBuffer: true
          }
        );

        mpegtsPlayer.attachMediaElement(video);
        mpegtsPlayer.load();

        mpegtsPlayer.on(mpegts.Events.ERROR, (errType: any, errDetail: any) => {
          console.warn('[mpegts] Stream error:', errType, errDetail);
          if (errType === mpegts.ErrorTypes.NETWORK_ERROR) {
            setError('Stream network error. Reconnecting...');
          }
        });

        startPlayback();
      } catch (err) {
        console.error('[mpegts] Failed to initialize player:', err);
        setError('Failed to initialize stream player.');
        setIsLoading(false);
      }
    } else if (Hls.isSupported()) {
      hlsPlayer = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });

      hlsPlayer.loadSource(streamUrl);
      hlsPlayer.attachMedia(video);

      hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        startPlayback();
      });

      hlsPlayer.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError('Failed to play stream. Upstream broadcast may be offline.');
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari iOS/macOS)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        startPlayback();
      });
    } else {
      // Direct video stream
      video.src = streamUrl;
      video.load();
      startPlayback();
    }

    const handlePlaying = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Unable to load channel stream.');
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);

      if (mpegtsPlayer) {
        try {
          mpegtsPlayer.pause();
          mpegtsPlayer.unload();
          mpegtsPlayer.detachMediaElement();
          mpegtsPlayer.destroy();
        } catch (e) {
          console.error('[mpegts] Cleanup error:', e);
        }
      }

      if (hlsPlayer) {
        try {
          hlsPlayer.destroy();
        } catch (e) {
          console.error('[HLS] Cleanup error:', e);
        }
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
