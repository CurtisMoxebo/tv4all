import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Channel } from '../types/channel';
import { Logo } from '../components/Logo';
import { LanguageSelector } from '../components/LanguageSelector';
import { Footer } from '../components/Footer';

interface AddChannelForm {
  name: string;
  url: string;
  logo: string;
  group: string;
  id: string;
  chno: string;
  country: string;
}

const INITIAL_FORM: AddChannelForm = {
  name: '',
  url: '',
  logo: '',
  group: 'General',
  id: '',
  chno: '',
  country: 'FR'
};

const COMMON_GROUPS = ['General', 'News', 'Sport', 'Kids', 'Local', 'Music', 'Movies', 'Entertainment'];

export const ManageChannelsPage: React.FC = () => {
  const { t } = useTranslation();
  const { token, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter in management list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Add channel state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [addMode, setAddMode] = useState<'form' | 'raw'>('form');

  // 1. Structured form state
  const [formData, setFormData] = useState<AddChannelForm>(INITIAL_FORM);

  // 2. Raw 2-line M3U state
  const [rawExtinf, setRawExtinf] = useState('');
  const [rawUrl, setRawUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addErrorsList, setAddErrorsList] = useState<string[]>([]);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Delete channel state
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Authentication & Admin verification
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { from: '/manage-channels' } });
    }
  }, [isAuthenticated, navigate]);

  // Fetch channels list
  const loadChannels = async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`${API_ENDPOINTS.CHANNELS}?refresh=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          return;
        }
        throw new Error(`Failed to load channels (HTTP ${res.status})`);
      }

      const data = await res.json();
      setChannels(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin && token) {
      loadChannels();
    }
  }, [isAuthenticated, isAdmin, token]);

  // Live parser preview for raw 2-line M3U input
  const parsedRawPreview = useMemo(() => {
    if (!rawExtinf.trim()) return null;
    try {
      const extinf = rawExtinf.trim();
      const commaIndex = extinf.indexOf(',');
      const rawTitle = commaIndex !== -1 ? extinf.slice(commaIndex + 1).trim() : '';

      const tvgNameMatch = extinf.match(/tvg-name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/i);
      const tvgName = tvgNameMatch ? (tvgNameMatch[1] ?? tvgNameMatch[2] ?? tvgNameMatch[3]) : null;

      const tvgIdMatch = extinf.match(/tvg-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/i);
      const tvgId = tvgIdMatch ? (tvgIdMatch[1] ?? tvgIdMatch[2] ?? tvgIdMatch[3]) : null;

      const tvgLogoMatch = extinf.match(/tvg-logo\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/i);
      const tvgLogo = tvgLogoMatch ? (tvgLogoMatch[1] ?? tvgLogoMatch[2] ?? tvgLogoMatch[3]) : null;

      const groupMatch = extinf.match(/group-title\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/i);
      const groupTitle = groupMatch ? (groupMatch[1] ?? groupMatch[2] ?? groupMatch[3]) : null;

      const name = tvgName || rawTitle || 'Channel Title';
      const logo = tvgLogo || '';
      const group = groupTitle || 'General';
      const id = tvgId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return {
        name,
        logo,
        group,
        id,
        url: rawUrl.trim()
      };
    } catch {
      return null;
    }
  }, [rawExtinf, rawUrl]);

  // Quick auto-split when pasting both lines at once into Line 1
  const handleExtinfPaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes('\n')) {
      e.preventDefault();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 2) {
        setRawExtinf(lines[0]);
        setRawUrl(lines[1]);
      } else if (lines.length === 1) {
        setRawExtinf(lines[0]);
      }
    }
  };

  // Handle Add Channel submission (Structured Form)
  const handleAddStructuredChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setAddError(null);
    setAddErrorsList([]);
    setAddSuccess(null);

    const payload: Record<string, string> = {
      name: formData.name.trim(),
      url: formData.url.trim()
    };

    if (formData.logo.trim()) payload.logo = formData.logo.trim();
    if (formData.group.trim()) payload.group = formData.group.trim();
    if (formData.id.trim()) payload.id = formData.id.trim();
    if (formData.chno.trim()) payload.chno = formData.chno.trim();
    if (formData.country.trim()) payload.country = formData.country.trim();

    try {
      const res = await fetch(API_ENDPOINTS.CHANNELS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.message || 'Failed to add channel');
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setAddErrorsList(data.errors);
        }
        return;
      }

      setAddSuccess(`Channel "${data.channel?.name || formData.name}" added successfully!`);
      setFormData(INITIAL_FORM);
      setIsAddFormOpen(false);

      await loadChannels();
      setTimeout(() => setAddSuccess(null), 5000);
    } catch (err) {
      setAddError((err as Error).message || 'Network error while adding channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Channel submission (Raw 2-Line M3U)
  const handleAddRawM3UChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setAddError(null);
    setAddErrorsList([]);
    setAddSuccess(null);

    try {
      const res = await fetch(API_ENDPOINTS.CHANNEL_RAW, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          extinf: rawExtinf.trim(),
          url: rawUrl.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.message || 'Failed to add channel from M3U lines');
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setAddErrorsList(data.errors);
        }
        return;
      }

      setAddSuccess(`Channel "${data.channel?.name || 'New Channel'}" added successfully from M3U lines!`);
      setRawExtinf('');
      setRawUrl('');
      setIsAddFormOpen(false);

      await loadChannels();
      setTimeout(() => setAddSuccess(null), 5000);
    } catch (err) {
      setAddError((err as Error).message || 'Network error while adding channel');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Channel
  const handleDeleteChannel = async () => {
    if (!channelToDelete || !token) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(API_ENDPOINTS.CHANNEL_DELETE(channelToDelete.id), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.message || data.error || 'Failed to delete channel');
        return;
      }

      setDeleteSuccess(`Channel "${channelToDelete.name}" was removed from the playlist.`);
      setChannelToDelete(null);

      // Update local state immediately
      setChannels(prev => prev.filter(c => c.id !== channelToDelete.id));

      setTimeout(() => setDeleteSuccess(null), 5000);
    } catch (err) {
      setDeleteError((err as Error).message || 'Network error while deleting channel');
    } finally {
      setIsDeleting(false);
    }
  };

  // Available unique groups for filter tabs
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    channels.forEach(c => {
      if (c.group) set.add(c.group);
    });
    return Array.from(set).sort();
  }, [channels]);

  // Filtered channel list
  const filteredChannels = useMemo(() => {
    let list = channels;

    if (selectedGroup !== 'all') {
      const g = selectedGroup.toLowerCase();
      list = list.filter(c => (c.group || '').toLowerCase() === g);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [channels, selectedGroup, searchQuery]);

  // Access denied screen for non-admin users
  if (isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#080c16] text-white flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-[#0d1527] border border-rose-900/40 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3.5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">{t('admin.accessDenied', 'Admin Access Required')}</h2>
          <p className="text-sm text-slate-400">
            {t('admin.accessDeniedDesc', 'You must be signed in as an administrator to manage channels.')}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-md"
            >
              {t('admin.backToHome', 'Back to Player')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c16] text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#1e2c47] bg-[#0c1220]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Back Link & Logo */}
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              aria-label={t('admin.backToHome', 'Back to Player')}
              title={t('admin.backToHome', 'Back to Player')}
              className="group p-2 rounded-xl transition-all duration-150 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#151f32]"
            >
              <svg className="w-5 h-5 transition-transform duration-150 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>

            <Link to="/">
              <Logo size="md" />
            </Link>

            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
              Admin
            </span>
          </div>

          {/* Right: Language & Logout */}
          <div className="flex items-center space-x-3">
            <LanguageSelector />

            <div className="flex items-center pl-3 border-l border-[#1e2c47]">
              <button
                type="button"
                onClick={logout}
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
                className="group p-2 sm:px-3 sm:py-1.5 rounded-xl transition-all duration-150 flex items-center space-x-1.5 text-slate-400 hover:text-white hover:bg-[#151f32] cursor-pointer"
              >
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-xs font-semibold hidden sm:inline">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2c47]">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>{t('admin.manageTitle', 'Manage Channels')}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#151f32] text-slate-300 border border-[#263756]">
                {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t('admin.manageSubtitle', 'Add and remove channels from the M3U playlist file')}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsAddFormOpen(prev => !prev);
                setAddError(null);
                setAddErrorsList([]);
              }}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center space-x-2 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isAddFormOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                )}
              </svg>
              <span>{isAddFormOpen ? 'Close Form' : t('admin.addChannel', 'Add New Channel')}</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {addSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{addSuccess}</span>
            </div>
            <button onClick={() => setAddSuccess(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {deleteSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{deleteSuccess}</span>
            </div>
            <button onClick={() => setDeleteSuccess(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Add Channel Collapsible Form */}
        {isAddFormOpen && (
          <div className="bg-[#0d1527] border border-indigo-900/50 rounded-2xl p-6 shadow-2xl shadow-indigo-950/30 space-y-5 animate-in fade-in slide-in-from-top-4 duration-200">
            {/* Header with Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2c47] pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                  +
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {t('admin.addChannel', 'Add New Channel')}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {addMode === 'form' ? 'Configure channel fields using the form' : 'Paste the 2 M3U lines (#EXTINF + stream URL)'}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-[#151f32] border border-[#263756] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode('form');
                    setAddError(null);
                    setAddErrorsList([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    addMode === 'form'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{t('admin.addModeForm', 'Form Fields')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddMode('raw');
                    setAddError(null);
                    setAddErrorsList([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    addMode === 'raw'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>{t('admin.addModeM3U', 'Raw M3U (2 Lines)')}</span>
                </button>
              </div>
            </div>

            {/* Validation errors banner */}
            {addError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs space-y-1">
                <div className="font-semibold text-rose-200">{addError}</div>
                {addErrorsList.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-rose-300">
                    {addErrorsList.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* MODE 1: Standard Structured Form */}
            {addMode === 'form' && (
              <form onSubmit={handleAddStructuredChannel} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Channel Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Channel Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TF1, BFM TV, France 24"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                    />
                  </div>

                  {/* Stream URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Stream URL (HLS / m3u8) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/live/stream.m3u8"
                      value={formData.url}
                      onChange={e => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                    />
                  </div>

                  {/* Group / Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Category / Group
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. News, Sport, General, Kids"
                      value={formData.group}
                      onChange={e => setFormData({ ...formData, group: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                    />
                    {/* Category quick suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {COMMON_GROUPS.map(g => (
                        <button
                          type="button"
                          key={g}
                          onClick={() => setFormData({ ...formData, group: g })}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                            formData.group.toLowerCase() === g.toLowerCase()
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[#151f32] text-slate-400 hover:text-white hover:bg-[#1d2b45]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Logo Image URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={formData.logo}
                        onChange={e => setFormData({ ...formData, logo: e.target.value })}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                      />
                      {formData.logo ? (
                        <div className="w-10 h-10 rounded-lg bg-[#080d1a] border border-[#263756] overflow-hidden flex items-center justify-center shrink-0 p-1">
                          <img
                            src={formData.logo}
                            alt="Preview"
                            className="w-full h-full object-contain"
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Optional Custom Channel ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Channel ID (tvg-id)</span>
                      <span className="text-[10px] text-slate-500 font-normal lowercase">auto-derived if empty</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TF1.fr (optional)"
                      value={formData.id}
                      onChange={e => setFormData({ ...formData, id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                    />
                  </div>

                  {/* Channel Number & Country */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Channel No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1"
                        value={formData.chno}
                        onChange={e => setFormData({ ...formData, chno: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Country
                      </label>
                      <input
                        type="text"
                        placeholder="FR"
                        value={formData.country}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(INITIAL_FORM);
                      setIsAddFormOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#151f32] text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving Channel...</span>
                      </>
                    ) : (
                      <span>Add to Playlist</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* MODE 2: Raw 2-Line M3U Input */}
            {addMode === 'raw' && (
              <form onSubmit={handleAddRawM3UChannel} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#121c33] border border-indigo-900/40 text-xs text-indigo-300 flex items-start space-x-2.5">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-semibold text-white">2-Line M3U Entry:</span> Pasting both lines at once into Line 1 will automatically populate both fields!
                  </div>
                </div>

                {/* Line 1: #EXTINF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{t('admin.m3uLine1', 'Line 1: #EXTINF Directive')} <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500 lowercase font-mono">starts with #EXTINF:</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder='#EXTINF:-1 tvg-name="France 2" tvg-logo="https://..." tvg-id="France2.fr" group-title="General",France 2'
                    value={rawExtinf}
                    onChange={e => setRawExtinf(e.target.value)}
                    onPaste={handleExtinfPaste}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white font-mono placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                  />
                </div>

                {/* Line 2: Stream URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{t('admin.m3uLine2', 'Line 2: Stream URL')} <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500 lowercase font-mono">http:// or https://</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/stream/index.m3u8"
                    value={rawUrl}
                    onChange={e => setRawUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#151f32] border border-[#263756] text-white font-mono placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                  />
                </div>

                {/* Real-time Parsed Metadata Preview */}
                {parsedRawPreview && (
                  <div className="p-4 rounded-xl bg-[#10182b] border border-[#1e2c47] space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Metadata Preview</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Logo */}
                      <div className="w-10 h-10 rounded-xl bg-[#080d1a] border border-[#263756] overflow-hidden flex items-center justify-center shrink-0 p-1">
                        {parsedRawPreview.logo ? (
                          <img
                            src={parsedRawPreview.logo}
                            alt="Preview"
                            className="w-full h-full object-contain"
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-xs font-bold text-slate-500 uppercase">
                            {parsedRawPreview.name.slice(0, 2)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white truncate">{parsedRawPreview.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#151f32] text-indigo-300 border border-indigo-900/40 shrink-0">
                            {parsedRawPreview.group}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono truncate">
                          ID: <span className="text-slate-300">{parsedRawPreview.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRawExtinf('');
                      setRawUrl('');
                      setIsAddFormOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#151f32] text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !rawExtinf.trim() || !rawUrl.trim()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving M3U Entry...</span>
                      </>
                    ) : (
                      <span>Append M3U Lines</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Channels Management View */}
        <div className="bg-[#0c1220] border border-[#1e2c47] rounded-2xl overflow-hidden shadow-xl">
          {/* List Search & Filter Header */}
          <div className="p-4 sm:p-5 border-b border-[#1e2c47] bg-[#0d1527]/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search input */}
            <div className="relative w-full sm:w-80">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, ID, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#151f32] border border-[#263756] text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category filter dropdown */}
            <div className="relative w-full sm:w-60 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <select
                id="category-filter"
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                aria-label="Filter channels by category"
                className={`w-full pl-9 pr-9 py-2 rounded-xl bg-[#151f32] border text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors cursor-pointer appearance-none ${
                  selectedGroup !== 'all' ? 'border-indigo-500/70 text-indigo-300' : 'border-[#263756] text-white'
                }`}
              >
                <option value="all" className="bg-[#0d1527] text-white">
                  All Categories ({channels.length})
                </option>
                {availableGroups.map(group => {
                  const count = channels.filter(c => c.group === group).length;
                  return (
                    <option key={group} value={group} className="bg-[#0d1527] text-white">
                      {group} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Channels Table / List */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">{t('common.loading', 'Loading channels...')}</p>
            </div>
          ) : fetchError ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-rose-400 font-semibold">{fetchError}</p>
              <button
                type="button"
                onClick={loadChannels}
                className="px-4 py-1.5 rounded-lg bg-[#151f32] text-xs font-semibold hover:bg-[#1e2c47]"
              >
                Retry
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">No channels match your criteria</p>
              <p className="text-xs text-slate-500">Try modifying your search or adding a new channel.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e2c47]">
              {filteredChannels.map((channel, index) => (
                <div
                  key={channel.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#10182b] transition-colors group"
                >
                  {/* Channel Info */}
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-6 text-right shrink-0">
                      {index + 1}
                    </span>

                    {/* Logo */}
                    <div className="w-10 h-10 rounded-xl bg-[#080d1a] border border-[#1e2c47] overflow-hidden flex items-center justify-center shrink-0 p-1">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-contain"
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase bg-[#0d1527]">
                          {channel.name.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white truncate">{channel.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#151f32] text-indigo-300 border border-indigo-900/40 shrink-0">
                          {channel.group || 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                        ID: <span className="text-slate-300">{channel.id}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                    {/* Test Watch in Player */}
                    <Link
                      to={`/${encodeURIComponent(channel.id)}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#151f32] border border-[#263756] hover:text-white hover:bg-[#1d2b45] transition-colors flex items-center space-x-1.5"
                      title="Test stream in player"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Watch</span>
                    </Link>

                    {/* Delete Channel Button */}
                    <button
                      type="button"
                      onClick={() => setChannelToDelete(channel)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/60 hover:text-white transition-colors flex items-center space-x-1.5 cursor-pointer"
                      title="Delete channel from playlist"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {channelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0d1527] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/70 border border-rose-800/60 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t('admin.deleteChannel', 'Delete Channel')}
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-bold text-white">"{channelToDelete.name}"</span> (<code className="text-xs text-indigo-300 bg-[#151f32] px-1.5 py-0.5 rounded">{channelToDelete.id}</code>)?
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setChannelToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#151f32] text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteChannel}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all shadow-md shadow-rose-600/30 disabled:opacity-50 cursor-pointer flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ManageChannelsPage;
