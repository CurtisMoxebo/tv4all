import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Channel } from '../types/channel';
import { Logo } from '../components/Logo';
import { LanguageSelector } from '../components/LanguageSelector';
import { VideoPlayer } from '../components/VideoPlayer';
import { ChannelCard } from '../components/ChannelCard';
import { FilterPopover, SortOrder } from '../components/FilterPopover';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { channelId } = useParams<{ channelId?: string }>();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOrder>('default');

  // Search / filter animation state
  const [isSearching, setIsSearching] = useState(false);
  const isFirstRender = useRef(true);

  // Trigger search animation when query, category, or sort changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy]);

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Redirect to login if unauthenticated (preserve target URL)
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Fetch channel list on mount
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(API_ENDPOINTS.CHANNELS, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            logout();
            throw new Error('Session expired, please log in again');
          }
          throw new Error(`Failed to load channels: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: Channel[]) => {
        if (isMounted) {
          setChannels(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError((err as Error).message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  // Extract unique categories and counts
  const { categories, channelCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    const catSet = new Set<string>();

    for (const ch of channels) {
      const g = ch.group || 'General';
      catSet.add(g);
      counts[g] = (counts[g] || 0) + 1;
    }

    return {
      categories: Array.from(catSet).sort(),
      channelCounts: counts
    };
  }, [channels]);

  // Filter channels based on selected category, search query & sort order
  const filteredChannels = useMemo(() => {
    let result = channels.filter(ch => {
      const matchesCategory =
        selectedCategory === 'all' ||
        (ch.group || 'General').toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ch.name.toLowerCase().includes(q) ||
        ch.id.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'desc') {
      result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [channels, selectedCategory, searchQuery, sortBy]);

  // Sync selectedChannel with channelId from URL
  useEffect(() => {
    if (!channels.length) return;

    if (channelId) {
      const decoded = decodeURIComponent(channelId).toLowerCase();
      const matched = channels.find(
        ch => ch.id.toLowerCase() === decoded || ch.name.toLowerCase() === decoded
      );
      if (matched) {
        setSelectedChannel(matched);
      }
    } else {
      setSelectedChannel(null);
    }
  }, [channelId, channels]);

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsDrawerOpen(false); // Close drawer on mobile upon selection
    navigate(`/${encodeURIComponent(channel.id)}`);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#080c16] text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1e2c47] bg-[#0c1220]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Mobile Drawer Trigger + Logo */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(prev => !prev)}
              aria-label="Toggle channels drawer"
              className="group lg:hidden p-2 rounded-xl transition-all duration-150 flex items-center justify-center cursor-pointer text-slate-400 hover:text-white hover:bg-[#151f32] focus:outline-none"
            >
              <svg
                className="w-5 h-5 transition-transform duration-150 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link to="/" onClick={() => setSelectedChannel(null)}>
              <Logo size="md" />
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            <LanguageSelector />

            <div className="flex items-center pl-3 border-l border-[#1e2c47]">
              <button
                type="button"
                onClick={logout}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className="group p-2 sm:px-3 sm:py-1.5 rounded-xl transition-all duration-150 flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-white hover:bg-[#151f32] focus:outline-none"
              >
                <svg
                  className="w-5 h-5 transition-transform duration-150 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-xs font-semibold hidden sm:inline">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Mobile Backdrop Overlay */}
          {isDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 lg:hidden transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />
          )}

          {/* LEFT: Channels Drawer (Off-canvas slide-in on mobile, permanent column on desktop) */}
          <aside
            className={`
              fixed inset-y-0 left-0 w-84 sm:w-96 max-w-[85vw] bg-[#0c1220] border-r border-[#1e2c47] p-4 z-50 overflow-y-auto custom-scrollbar
              transition-transform duration-300 ease-in-out
              lg:static lg:inset-auto lg:w-auto lg:max-w-none lg:bg-transparent lg:border-r-0 lg:p-0 lg:z-auto lg:overflow-visible
              lg:col-span-5 xl:col-span-4 lg:flex lg:flex-col lg:space-y-4
              ${isDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* Mobile Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2c47] lg:hidden mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">{t('channels.title')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#151f32] text-slate-300 border border-[#263756]">
                  {filteredChannels.length}
                </span>
                {isAdmin && (
                  <Link
                    to="/manage-channels"
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded-md ml-1"
                  >
                    + Manage
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close channels drawer"
                className="group p-2 rounded-xl transition-all duration-150 flex items-center justify-center cursor-pointer text-slate-400 hover:text-white hover:bg-[#151f32] focus:outline-none"
              >
                <svg
                  className="w-5 h-5 transition-transform duration-150 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Header, Search & Categories Container */}
            <div className="space-y-3 mb-4">
              <div className="hidden lg:flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {t('channels.title')}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {filteredChannels.length} {filteredChannels.length === 1 ? 'channel' : 'channels'} available
                  </p>
                </div>
                {isAdmin && (
                  <Link
                    to="/manage-channels"
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2 py-1 rounded-lg flex items-center space-x-1 hover:border-indigo-500/50 transition-colors"
                  >
                    <span>+ Manage</span>
                  </Link>
                )}
              </div>

              {/* Search & Filter Row */}
              <div className="flex items-center gap-2 w-full">
                {/* Search input */}
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('channels.searchPlaceholder')}
                    className={`w-full pl-9 pr-8 py-2 rounded-xl bg-transparent border text-white placeholder-slate-400 focus:outline-none text-xs transition-all duration-200 ${
                      isSearching
                        ? 'border-indigo-400 ring-1 ring-indigo-500/40 shadow-sm shadow-indigo-500/20'
                        : 'border-[#263756] focus:border-indigo-400'
                    }`}
                  />

                  {/* Left Search Icon with animated spinner when searching */}
                  {isSearching ? (
                    <div className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5 pointer-events-none flex items-center justify-center animate-spin">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                    </div>
                  ) : (
                    <svg
                      className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
                      />
                    </svg>
                  )}

                  {/* Scanning beam along bottom edge of input during search */}
                  {isSearching && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] overflow-hidden rounded-full pointer-events-none">
                      <div className="w-full h-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-search-scan" />
                    </div>
                  )}

                  {/* Clear Search Button */}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-[#151f32]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filter Icon Button (includes Category filter & sorting) */}
                <FilterPopover
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={cat => setSelectedCategory(cat)}
                  channelCounts={channelCounts}
                  totalChannelsCount={channels.length}
                  sortBy={sortBy}
                  onSelectSortBy={setSortBy}
                />
              </div>

              {/* Active Category Tag Indicator */}
              {selectedCategory !== 'all' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-transparent border border-[#263756] text-xs">
                  <span className="text-slate-400">
                    Category: <strong className="text-white font-semibold">{selectedCategory}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="text-slate-400 hover:text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Clear ✕
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Channels List */}
            <div className="lg:overflow-y-auto lg:max-h-[calc(100vh-320px)] pr-1 custom-scrollbar">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 border-3 border-slate-700 border-t-white rounded-full animate-spin mb-3"></div>
                  <p className="text-xs text-slate-400">{t('common.loading')}</p>
                </div>
              ) : error ? (
                <div className="py-8 px-4 rounded-xl bg-red-950/20 border border-red-900/50 text-center space-y-2">
                  <p className="text-xs font-semibold text-red-400">{error}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    {t('common.refresh')}
                  </button>
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-[#1e2c47] bg-[#0d1527] p-6">
                  <p className="text-xs text-slate-400">{t('channels.noChannels')}</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredChannels.map(channel => (
                    <motion.div
                      key={channel.id}
                      layout
                      initial={{ opacity: 0, x: -28, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 28, scale: 0.95 }}
                      transition={{
                        opacity: { duration: 0.2 },
                        x: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                        layout: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                      }}
                      className="mb-1.5"
                    >
                      <ChannelCard
                        channel={channel}
                        isSelected={selectedChannel?.id === channel.id}
                        searchQuery={searchQuery}
                        onSelect={handleSelectChannel}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </aside>

          {/* RIGHT: Video Player */}
          <div className="lg:col-span-7 xl:col-span-8 lg:sticky lg:top-22 space-y-3">
            <VideoPlayer channel={selectedChannel} token={token} />

            {/* Now Playing info bar */}
            {selectedChannel ? (
              <div className="p-4 rounded-xl bg-[#0d1527] border border-[#1e2c47] flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <div className="truncate">
                    <h2 className="text-base font-bold text-white truncate">
                      {selectedChannel.name}
                    </h2>
                    <p className="text-xs text-slate-400 truncate">
                      {selectedChannel.group}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel(null);
                    navigate('/');
                  }}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-[#151f32] border border-[#263756] rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#0d1527]/50 border border-[#1e2c47]/60 text-center">
                <p className="text-xs text-slate-400">
                  Select any channel from the list on the left to start watching
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
