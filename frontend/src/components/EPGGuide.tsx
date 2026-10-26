import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Channel } from '../types/channel';
import { ChannelEPGResponse } from '../types/epg';
import { API_ENDPOINTS } from '../config/api';

interface EPGGuideProps {
  channel: Channel | null;
  token: string | null;
}

export const EPGGuide: React.FC<EPGGuideProps> = ({ channel, token }) => {
  const { t } = useTranslation();
  const [epgData, setEpgData] = useState<ChannelEPGResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (isoString?: string): string => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const calculateMinutesRemaining = (stopIso?: string): number => {
    if (!stopIso) return 0;
    try {
      const stop = new Date(stopIso).getTime();
      const now = Date.now();
      const diffMinutes = Math.max(0, Math.round((stop - now) / 60000));
      return diffMinutes;
    } catch {
      return 0;
    }
  };

  const fetchEPG = useCallback(async () => {
    if (!channel || !token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(API_ENDPOINTS.EPG(channel.id, channel.name), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ChannelEPGResponse = await res.json();
      setEpgData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [channel, token]);

  useEffect(() => {
    fetchEPG();

    // Auto-refresh EPG every 60 seconds
    const interval = setInterval(() => {
      fetchEPG();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchEPG]);

  if (!channel) {
    return null;
  }

  return (
    <div
      data-testid="epg-guide"
      className="p-4 rounded-xl bg-[#0d1527] border border-[#1e2c47] shadow-lg space-y-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#1e2c47]/80 pb-3">
        <div className="flex items-center space-x-2">
          <svg
            className="w-4 h-4 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-sm font-bold text-white tracking-wide">
            {t('epg.title')}
          </h3>
        </div>

        <button
          type="button"
          onClick={fetchEPG}
          disabled={loading}
          aria-label={t('epg.refresh')}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#151f32] hover:bg-[#1a2842] border border-[#263756] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">{t('epg.refresh')}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && !epgData && (
        <div className="space-y-3 animate-pulse py-2">
          <div className="h-4 bg-[#1a2842] rounded w-3/4"></div>
          <div className="h-2 bg-[#1a2842] rounded-full w-full"></div>
          <div className="h-10 bg-[#151f32] rounded-lg w-full"></div>
        </div>
      )}

      {/* Error state */}
      {error && !epgData && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-xs text-center">
          {t('epg.noSchedule')}
        </div>
      )}

      {/* Live Now Program Card */}
      {epgData?.current ? (
        <div className="space-y-2.5 bg-[#121c33]/70 p-3.5 rounded-xl border border-indigo-950/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-600/90 text-white shadow-sm shadow-rose-600/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>{t('epg.liveNow')}</span>
              </span>

              {epgData.current.category && (
                <span className="text-[10px] font-semibold text-slate-300 px-2 py-0.5 rounded bg-[#1e2c47]/80">
                  {epgData.current.category}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              <span>{formatTime(epgData.current.start)}</span>
              <span className="mx-1">&ndash;</span>
              <span>{formatTime(epgData.current.stop)}</span>
              <span className="text-slate-500 mx-1.5">&bull;</span>
              <span className="text-indigo-400 font-semibold">
                {calculateMinutesRemaining(epgData.current.stop)} {t('epg.minsLeft')}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-white tracking-tight leading-snug">
              {epgData.current.title}
            </h4>
            {epgData.current.desc && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {epgData.current.desc}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-[#1e2c47] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out shadow-sm shadow-indigo-500/50"
                style={{ width: `${Math.min(100, Math.max(5, epgData.current.progress ?? 0))}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="p-3.5 rounded-lg bg-[#151f32]/60 text-slate-400 text-xs text-center">
            {t('epg.noSchedule')}
          </div>
        )
      )}

      {/* Upcoming Schedule */}
      {epgData && epgData.upcoming.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('epg.upcoming')}</span>
          </h4>

          <div className="space-y-1.5">
            {epgData.upcoming.map(prog => (
              <div
                key={prog.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#151f32]/50 hover:bg-[#151f32] border border-[#1e2c47]/50 transition-colors gap-3"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-xs font-bold text-indigo-300 shrink-0 font-mono">
                    {formatTime(prog.start)}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">
                      {prog.title}
                    </p>
                    {prog.desc && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {prog.desc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  {prog.category && (
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-[#1e2c47]/60 hidden sm:inline">
                      {prog.category}
                    </span>
                  )}
                  {prog.durationMinutes && (
                    <span className="text-[10px] text-slate-400">
                      {prog.durationMinutes}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EPGGuide;
