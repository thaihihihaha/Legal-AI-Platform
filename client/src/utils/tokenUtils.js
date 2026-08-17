/**
 * Token Management Utilities
 * Handles token refresh, validation, and expiry
 */

const API_URL = import.meta.env.VITE_API_URL || '';

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

function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export function getTokenTTL(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return -1;
  return Math.floor(decoded.exp - Date.now() / 1000);
}

export function shouldRefreshToken(token) {
  const ttl = getTokenTTL(token);
  return ttl > 0 && ttl < 300; // 5 minutes
}

export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (token.split('.').length !== 3) return false;
  const decoded = decodeToken(token);
  return !!decoded && !!decoded.exp && !!decoded.id;
}

// ─── Token Refresh Logic ───────────────────────────────────────────────────

let refreshPromise = null;

/**
 * Refresh access token.
 * Returns new access token string, or null if refresh is not possible.
 * NEVER calls handleTokenExpiry directly — callers decide what to do.
 *
 * Handles race condition: if another concurrent refresh already succeeded
 * (e.g. rapid F5), we detect the token changed in localStorage and reuse it.
 */
async function refreshAccessToken() {
  const refreshTokenSnapshot = TokenStorage.getRefreshToken();

  if (!refreshTokenSnapshot) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTokenSnapshot }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // This refresh token was rejected. Check if a concurrent request
        // (another rapid F5 tab/load) already refreshed successfully and
        // wrote new tokens to localStorage.
        const currentRefreshToken = TokenStorage.getRefreshToken();
        const currentAccessToken = TokenStorage.getAccessToken();
        if (
          currentRefreshToken !== refreshTokenSnapshot &&
          currentAccessToken &&
          !isTokenExpired(currentAccessToken)
        ) {
          // Race condition resolved: another load already refreshed — reuse
          return currentAccessToken;
        }
        // Truly invalid — clear tokens so caller can redirect to login
        TokenStorage.clearTokens();
        return null;
      }
      // Non-401 server error (500 etc.) — don't clear tokens, may be transient
      return null;
    }

    const data = await response.json();
    TokenStorage.setTokens(data.token, data.refresh_token);
    if (data.user) TokenStorage.setUser(data.user);
    return data.token;
  } catch {
    // Network error (no connection, server down momentarily).
    // Do NOT clear tokens or redirect — the session is still stored.
    // The user will get 401s on API calls and can retry naturally.
    return null;
  }
}

/**
 * Deduplicated token refresh — concurrent callers share one promise.
 */
async function autoRefreshToken() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── HTTP Request Handler ──────────────────────────────────────────────────

export async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let accessToken = TokenStorage.getAccessToken();

  // Proactively refresh if token is expired or about to expire
  if (!accessToken || isTokenExpired(accessToken) || shouldRefreshToken(accessToken)) {
    const newToken = await autoRefreshToken();
    if (newToken) {
      accessToken = newToken;
    }
    // If newToken is null: network error or truly expired.
    // Continue with current (possibly expired) token — server will 401.
    accessToken = accessToken || TokenStorage.getAccessToken();
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, { ...options, headers });

  // Handle 401 — try one more refresh then retry the original request
  if (response.status === 401) {
    const newToken = await autoRefreshToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      return fetch(fullUrl, { ...options, headers });
    }
    // Refresh failed — tokens cleared → trigger logout
    handleTokenExpiry();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return response;
}

// ─── Graceful Logout ───────────────────────────────────────────────────────

export function handleTokenExpiry() {
  TokenStorage.clearTokens();
  window.dispatchEvent(
    new CustomEvent('token-expired', {
      detail: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
    })
  );
  // Only redirect if not already on login page
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function logout() {
  const accessToken = TokenStorage.getAccessToken();
  const refreshToken = TokenStorage.getRefreshToken();

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
    } catch {
      // Proceed with client-side logout regardless
    }
  }

  TokenStorage.clearTokens();
  window.location.href = '/login';
}

// ─── On App Start — Validate Tokens ────────────────────────────────────────

/**
 * Validate and optionally refresh tokens on app startup (called on each F5).
 *
 * Strategy:
 * - Access token valid and not expiring → true immediately (no network call)
 * - Access token expiring soon → refresh proactively; if refresh fails but
 *   token still valid, still return true
 * - Access token expired → attempt refresh; if refresh returns null due to
 *   network error, return false gracefully WITHOUT clearing tokens so the
 *   user can retry on next load
 * - Access token expired AND server explicitly rejected (tokens cleared by
 *   refreshAccessToken) → return false
 */
export async function validateStoredTokens() {
  const accessToken = TokenStorage.getAccessToken();
  const refreshToken = TokenStorage.getRefreshToken();

  // Nothing stored
  if (!accessToken || !refreshToken) {
    return false;
  }

  // Malformed token
  if (!validateToken(accessToken)) {
    TokenStorage.clearTokens();
    return false;
  }

  // Token still valid and has enough life left
  if (!isTokenExpired(accessToken) && !shouldRefreshToken(accessToken)) {
    return true;
  }

  // Token expired or expiring soon — attempt refresh
  const tokenWasExpired = isTokenExpired(accessToken);
  const newToken = await autoRefreshToken();

  if (newToken) {
    return true;
  }

  // Refresh returned null. Two possible causes:
  // 1. Network error — tokens may still be in localStorage
  // 2. Server 401 — tokens already cleared by refreshAccessToken

  const currentAccess = TokenStorage.getAccessToken();
  const currentRefresh = TokenStorage.getRefreshToken();

  // Tokens were cleared → genuinely expired and server confirmed
  if (!currentAccess || !currentRefresh) {
    return false;
  }

  // Tokens still in localStorage — network error during refresh.
  // If the access token hadn't expired yet, stay logged in.
  if (!tokenWasExpired) {
    return true;
  }

  // Access token was expired and refresh failed due to network error.
  // Allow up to 60-second grace period to avoid logout on transient network issues.
  const ttl = getTokenTTL(accessToken); // negative means expired
  const expiredSecondsAgo = Math.abs(ttl);
  if (expiredSecondsAgo < 60) {
    return true;
  }

  // Token has been expired too long and refresh isn't working
  TokenStorage.clearTokens();
  return false;
}

// ─── Token Monitor ─────────────────────────────────────────────────────────

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
      onExpiry?.();
    } else if (ttl < 300) {
      onWarning?.(ttl);
    }
  }

  intervalId = setInterval(checkToken, 30000);
  checkToken();
  return () => clearInterval(intervalId);
}

// ─── Backward Compatibility ───────────────────────────────────────────────

export function getToken() {
  return TokenStorage.getAccessToken();
}
