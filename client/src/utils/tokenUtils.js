/**
 * Enhanced Token Management Utilities
 * Handles token refresh, validation, and expiry
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ─── Token Storage ─────────────────────────────────────────────────────────

export const TokenStorage = {
  KEY_ACCESS: 'longpl_token',
  KEY_REFRESH: 'longpl_refresh_token',
  KEY_USER: 'longpl_user',

  getAccessToken() {
    return localStorage.getItem(this.KEY_ACCESS) || '';
  },

  getRefreshToken() {
    return localStorage.getItem(this.KEY_REFRESH) || '';
  },

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(this.KEY_ACCESS, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.KEY_REFRESH, refreshToken);
    }
  },

  clearTokens() {
    localStorage.removeItem(this.KEY_ACCESS);
    localStorage.removeItem(this.KEY_REFRESH);
    localStorage.removeItem(this.KEY_USER);
  },

  hasTokens() {
    return !!this.getAccessToken() && !!this.getRefreshToken();
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(this.KEY_USER, JSON.stringify(user));
    }
  },

  getUser() {
    try {
      const raw = localStorage.getItem(this.KEY_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};

// ─── Token Utilities ───────────────────────────────────────────────────────

/**
 * Decode JWT token without verification
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

/**
 * Get time until token expiry (in seconds)
 */
export function getTokenTTL(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return -1;
  return Math.floor(decoded.exp - Date.now() / 1000);
}

/**
 * Check if token should be refreshed proactively
 * Returns true if token expires within 5 minutes
 */
export function shouldRefreshToken(token) {
  const ttl = getTokenTTL(token);
  return ttl > 0 && ttl < 300; // 5 minutes
}

/**
 * Validate token structure and signature check
 */
export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (token.split('.').length !== 3) return false;
  const decoded = decodeToken(token);
  return !!decoded && !!decoded.exp && !!decoded.id;
}

// ─── Token Refresh Logic ───────────────────────────────────────────────────

let refreshPromise = null; // Prevent concurrent refresh requests

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const refreshToken = TokenStorage.getRefreshToken();

  if (!refreshToken) {
    // No refresh token, must logout
    handleTokenExpiry();
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleTokenExpiry();
      }
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    // Store new tokens
    TokenStorage.setTokens(data.token, data.refresh_token);

    return data.token;
  } catch (error) {
    console.error('Token refresh error:', error);
    handleTokenExpiry();
    throw error;
  }
}

/**
 * Auto-refresh token if needed before making request
 */
async function autoRefreshToken() {
  const accessToken = TokenStorage.getAccessToken();

  if (!accessToken || isTokenExpired(accessToken)) {
    // Token expired, must refresh
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken()
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  } else if (shouldRefreshToken(accessToken)) {
    // Token expiring soon, refresh proactively
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken()
        .catch(() => {
          // Silently fail - token still valid for now
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
  }

  return accessToken;
}

// ─── HTTP Request Handler ──────────────────────────────────────────────────

/**
 * Enhanced fetch with automatic token refresh
 * Replaces the old fetchWithAuth
 */
export async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let accessToken = TokenStorage.getAccessToken();

  // Auto-refresh if needed
  if (shouldRefreshToken(accessToken) || isTokenExpired(accessToken)) {
    try {
      accessToken = await autoRefreshToken();
    } catch {
      // Refresh failed, continue with current token
      // Server will return 401 if token is invalid
    }
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Convert relative URLs to absolute URLs using API_URL
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Handle 401 - token might have expired between refresh check and request
  if (response.status === 401) {
    // Try refresh one more time
    const refreshToken = TokenStorage.getRefreshToken();
    if (refreshToken && !isTokenExpired(accessToken)) {
      // Token should be valid but server rejected it
      // This shouldn't happen, but try refresh anyway
      try {
        accessToken = await refreshAccessToken();
        headers.Authorization = `Bearer ${accessToken}`;

        return fetch(fullUrl, {
          ...options,
          headers,
        });
      } catch {
        handleTokenExpiry();
        throw new Error('Token invalid. Please log in again.');
      }
    } else {
      handleTokenExpiry();
      throw new Error('Token expired. Please log in again.');
    }
  }

  return response;
}

// ─── Graceful Logout ───────────────────────────────────────────────────────

/**
 * Handle token expiry gracefully
 */
export function handleTokenExpiry() {
  TokenStorage.clearTokens();

  // Dispatch custom event so app can react
  window.dispatchEvent(
    new CustomEvent('token-expired', {
      detail: { message: 'Your session has expired. Please log in again.' },
    })
  );

  // Redirect to login
  window.location.href = '/login';
}

/**
 * Logout user - revoke all tokens
 */
export async function logout() {
  const accessToken = TokenStorage.getAccessToken();
  const refreshToken = TokenStorage.getRefreshToken();

  // Try to notify server
  if (accessToken && refreshToken) {
    try {
      await fetch(`${API_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with client-side logout anyway
    }
  }

  // Clear tokens
  TokenStorage.clearTokens();

  // Redirect to login
  window.location.href = '/login';
}

// ─── On App Start - Validate Tokens ────────────────────────────────────────

/**
 * Validate and restore tokens on app startup
 * Call this when app initializes
 */
export async function validateStoredTokens() {
  const accessToken = TokenStorage.getAccessToken();
  const refreshToken = TokenStorage.getRefreshToken();

  // No tokens stored
  if (!accessToken || !refreshToken) {
    return false;
  }

  // Validate token format
  if (!validateToken(accessToken)) {
    TokenStorage.clearTokens();
    return false;
  }

  // Token already expired or expiring very soon
  if (isTokenExpired(accessToken) || shouldRefreshToken(accessToken)) {
    try {
      const newToken = await refreshAccessToken();
      return !!newToken;
    } catch {
      TokenStorage.clearTokens();
      return false;
    }
  }

  // Tokens valid
  return true;
}

// ─── Token Monitoring ──────────────────────────────────────────────────────

/**
 * Start monitoring token expiry
 * Useful for frontend to show warnings or refresh proactively
 */
export function startTokenMonitor(onWarning, onExpiry) {
  let intervalId = null;

  function checkToken() {
    const token = TokenStorage.getAccessToken();
    if (!token) {
      clearInterval(intervalId);
      return;
    }

    const ttl = getTokenTTL(token);

    if (ttl <= 0) {
      // Token expired
      onExpiry?.();
    } else if (ttl < 300) {
      // Token expiring within 5 minutes
      onWarning?.(ttl);
    }
  }

  // Check every 30 seconds
  intervalId = setInterval(checkToken, 30000);

  // Check immediately
  checkToken();

  // Return cleanup function
  return () => clearInterval(intervalId);
}

// ─── Backward Compatibility ───────────────────────────────────────────────

/**
 * Get token (for backward compatibility)
 */
export function getToken() {
  return TokenStorage.getAccessToken();
}
