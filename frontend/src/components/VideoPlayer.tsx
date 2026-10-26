import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewersCount, setViewersCount] = useState<number>(0);

  // Poll live viewer count from backend for the currently selected channel
  useEffect(() => {
    if (!channel || !token) {
      setViewersCount(0);
      return;
    }

    // Default to at least 1 since this client is watching
    setViewersCount(1);

    let isMounted = true;
    const fetchViewerCount = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.STREAM_STATUS(channel.id), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (typeof data.viewersCount === 'number') {
            setViewersCount(Math.max(1, data.viewersCount));
          }
        }
      } catch {
        // Keep current count on transient network issue
      }
    };

    const initialTimer = setTimeout(fetchViewerCount, 1500);
    const interval = setInterval(fetchViewerCount, 4000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [channel, token]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Initially or when no channel is selected, show nothing
    if (!channel || !token) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.muted = false;
      setIsLoading(false);
      setError(null);
      return;
    }

    // Always keep video unmuted with full volume
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1.0;
    setIsLoading(true);
    setError(null);

    const streamUrl = `${API_ENDPOINTS.STREAM(channel.id)}?token=${encodeURIComponent(token)}`;
    let mpegtsPlayer: any = null;
    let hlsPlayer: Hls | null = null;

    const startPlayback = () => {
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1.0;
      try {
        const p = mpegtsPlayer ? mpegtsPlayer.play() : video.play();
        if (p !== undefined && typeof p?.catch === 'function') {
          p.catch((err: any) => {
            console.warn('[VideoPlayer] Play call caught / deferred:', err);
          });
        }
      } catch (e) {
        console.warn('Playback play() call deferred:', e);
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
            enableWorker: true,
            lazyLoad: false,
            liveBufferLatencyChasing: false,
            enableStashBuffer: true,
            stashInitialSize: 384 * 1024,
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 60,
            autoCleanupMinBackwardDuration: 30,
            fixAudioTimestampGap: true
          }
        );

        mpegtsPlayer.attachMediaElement(video);
        mpegtsPlayer.load();

        mpegtsPlayer.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string) => {
          console.error('[mpegts.js error]', errorType, errorDetail);
          setError(`Stream error (${errorType}): ${errorDetail}`);
          setIsLoading(false);
        });

        mpegtsPlayer.on(mpegts.Events.LOADING_COMPLETE, () => {
          console.log('[mpegts] Loading complete');
          setIsLoading(false);
        });

        mpegtsPlayer.on(mpegts.Events.MEDIA_INFO, () => {
          setIsLoading(false);
          startPlayback();
        });

        startPlayback();
      } catch (e: any) {
        console.error('Failed to initialize mpegts player:', e);
        setError('Failed to initialize stream player');
        setIsLoading(false);
      }
    } else if (Hls.isSupported() && channel.url?.includes('.m3u8')) {
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
          console.error('Fatal HLS error:', data);
          setError(`HLS error: ${data.details}`);
          setIsLoading(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsPlayer?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsPlayer?.recoverMediaError();
              break;
            default:
              hlsPlayer?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        startPlayback();
      });
    } else {
      // Fallback for direct browser support
      video.src = streamUrl;
      startPlayback();
    }

    let waitingTimer: any = null;

    const handlePlaying = () => {
      if (waitingTimer) {
        clearTimeout(waitingTimer);
        waitingTimer = null;
      }
      setIsLoading(false);
      setError(null);
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1.0;
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      startPlayback();
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      if (waitingTimer) clearTimeout(waitingTimer);
      waitingTimer = setTimeout(() => {
        if (video.paused || video.readyState < 3) {
          setIsLoading(true);
        }
      }, 400);
    };

    const handleVideoError = () => {
      setIsLoading(false);
      if (video.error) {
        const errorCodes: Record<number, string> = {
          1: 'Playback aborted by user',
          2: 'Network error while downloading stream',
          3: 'Media decoding error',
          4: 'Stream format not supported or unreachable'
        };
        setError(errorCodes[video.error.code] || 'An unknown video error occurred');
      }
    };

    // Any user click on the page ensures unmuted playback
    const handleUserGesture = () => {
      const v = videoRef.current;
      if (v) {
        v.muted = false;
        v.volume = 1.0;
        if (v.paused) {
          v.play().catch(() => {});
        }
      }
    };

    window.addEventListener('click', handleUserGesture);
    window.addEventListener('pointerdown', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleVideoError);

    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);

      if (waitingTimer) {
        clearTimeout(waitingTimer);
        waitingTimer = null;
      }
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleVideoError);

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
    };
  }, [channel, token, retryCount]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#1e2c47] shadow-2xl">
      <video
        ref={videoRef}
        controls={!!channel}
        playsInline
        muted={false}
        className="w-full h-full object-contain bg-black"
      />

      {/* When no channel is selected: display logo at center */}
      {!channel && (
        <div className="absolute inset-0 bg-black flex items-center justify-center select-none pointer-events-none">
          <Logo size="xl" />
        </div>
      )}

      {/* Loading overlay when buffering or switching channels */}
      {channel && isLoading && !error && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-3 border-slate-600 border-t-white rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-medium text-slate-300">
            Buffering live stream...
          </span>
        </div>
      )}

      {/* Stream error overlay */}
      {channel && error && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800/80 flex items-center justify-center mb-3 text-red-400 text-xl font-bold">
            !
          </div>
          <p className="text-sm font-semibold text-red-400 mb-1">{error}</p>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            The stream source might be temporarily offline or unreachable from the IPTV relay.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setRetryCount(c => c + 1);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#151f32] hover:bg-[#1e2c47] text-white border border-[#263756] transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Channel info banner on top left when active */}
      {channel && (
        <div className="absolute top-3 left-3 flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-slate-700/60 pointer-events-none z-10 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            {t('player.live', 'LIVE')}
          </span>
          <span className="text-xs text-slate-400 font-medium">|</span>
          <span className="text-xs font-semibold text-slate-200">
            {channel.name}
          </span>
        </div>
      )}

      {/* Live Viewers counter on top right when active */}
      {channel && (
        <div
          data-testid="live-viewers-badge"
          className="absolute top-3 right-3 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-slate-700/60 pointer-events-none z-10 shadow-lg text-xs font-semibold text-slate-200 select-none transition-opacity duration-300"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <svg
            className="w-3.5 h-3.5 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="tracking-wide">
            {viewersCount}{' '}
            <span className="text-slate-400 font-normal">
              {viewersCount === 1 ? t('player.viewer', 'viewer') : t('player.viewers', 'viewers')}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
