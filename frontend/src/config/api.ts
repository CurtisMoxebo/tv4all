/**
 * API and Backend configuration loaded from Vite environment variables.
 */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BACKEND_URL}/api`;

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  ME: `${API_BASE_URL}/auth/me`,
  CHANNELS: `${API_BASE_URL}/channels`,
  GROUPS: `${API_BASE_URL}/groups`,
  STREAM: (channelId: string) => `${API_BASE_URL}/stream/${channelId}`,
  BROADCASTS: `${API_BASE_URL}/broadcasts`,
  LOGS: `${API_BASE_URL}/logs`
};

