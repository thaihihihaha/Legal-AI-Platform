/**
 * Fetch with automatic token refresh
 * This is now a wrapper around the improved tokenUtils
 */
export {
  fetchWithAuth,
  logout,
  getToken,
  TokenStorage,
  validateStoredTokens,
  getTokenTTL,
  isTokenExpired,
  shouldRefreshToken,
  validateToken,
  handleTokenExpiry,
  startTokenMonitor,
} from './tokenUtils.js';

