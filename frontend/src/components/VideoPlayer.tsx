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
  const [retryCount, setRetryCount] = useState(0);

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

        mpegtsPlayer.on(mpegts.Events.ERROR, (errType: any, errDetail: any, errInfo: any) => {
          console.warn('[mpegts] Stream error:', errType, errDetail, errInfo);
          if (errType === mpegts.ErrorTypes.NETWORK_ERROR) {
            setError('Stream network connection lost. The upstream broadcast might be offline.');
            setIsLoading(false);
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

    let waitingTimer: ReturnType<typeof setTimeout> | null = null;

    const handlePlaying = () => {
      if (waitingTimer) {
        clearTimeout(waitingTimer);
        waitingTimer = null;
      }
      video.muted = false;
      setIsLoading(false);
      setError(null);
    };

    const handleCanPlay = () => {
      if (waitingTimer) {
        clearTimeout(waitingTimer);
        waitingTimer = null;
      }
      setIsLoading(false);
      setError(null);
      if (video.paused) {
        video.muted = false;
        video.volume = 1.0;
        const p = mpegtsPlayer ? mpegtsPlayer.play() : video.play();
        if (p !== undefined && typeof p?.catch === 'function') {
          p.catch(() => {});
        }
      }
    };

    const handleLoadedData = () => {
      if (waitingTimer) {
        clearTimeout(waitingTimer);
        waitingTimer = null;
      }
      video.muted = false;
      setIsLoading(false);
      setError(null);
    };

    const handleWaiting = () => {
      // Debounce loading overlay to avoid flickering on minor micro-buffers
      if (!waitingTimer) {
        waitingTimer = setTimeout(() => {
          setIsLoading(true);
        }, 700);
      }
    };

    const handleVideoError = (e: Event) => {
      if (waitingTimer) {
        clearTimeout(waitingTimer);
        waitingTimer = null;
      }
      const v = e.target as HTMLVideoElement;
      if (!v || !v.error) return;
      // Ignore initial reset when src is empty or not yet attached
      if (!v.currentSrc && !v.src) return;
      // Ignore MEDIA_ERR_ABORTED (code 1) which fires when user switches channels
      if (v.error.code === MediaError.MEDIA_ERR_ABORTED) return;

      console.error('[VideoPlayer] Media element error:', v.error.code, v.error.message);
      setIsLoading(false);
      setError('Unable to load channel stream.');
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
