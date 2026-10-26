/**
 * API and Backend configuration loaded from Vite environment variables.
 * Automatically resolves to port 8001 on the same host (LAN IP, public IP, or domain)
 * unless explicitly configured via VITE_BACKEND_URL.
 */
const getDefaultBackendUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8001`;
  }
  return 'http://localhost:8001';
};

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || getDefaultBackendUrl();
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${BACKEND_URL}/api`;

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  ME: `${API_BASE_URL}/auth/me`,
  CHANNELS: `${API_BASE_URL}/channels`,
  CHANNEL_RAW: `${API_BASE_URL}/channels/raw`,
  CHANNEL_DELETE: (channelId: string) => `${API_BASE_URL}/channels/${encodeURIComponent(channelId)}`,
  STREAM: (channelId: string) => `${API_BASE_URL}/stream/${channelId}`,
  STREAM_STATUS: (channelId: string) => `${API_BASE_URL}/stream/${encodeURIComponent(channelId)}/status`,
  EPG: (channelId: string, name?: string) =>
    `${API_BASE_URL}/epg/${encodeURIComponent(channelId)}${name ? `?name=${encodeURIComponent(name)}` : ''}`
};
