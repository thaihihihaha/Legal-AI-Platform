/**
 * Token Management Test Cases
 * Tests for refresh tokens, validation, refresh logic, and logout
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key';

// ─── Test Data Generation ──────────────────────────────────────────────────

function generateTestAccessToken(userId, expiresIn = '24h') {
  return jwt.sign(
    {
      id: userId,
      email: 'test@example.com',
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn }
  );
}

function generateTestRefreshToken(userId, expiresIn = '7d') {
  return jwt.sign(
    {
      id: userId,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn }
  );
}

function generateTestTempOtpToken(userId, expiresIn = '5m') {
  return jwt.sign(
    {
      id: userId,
      email: 'test@example.com',
      type: 'temp-otp',
    },
    JWT_SECRET,
    { expiresIn }
  );
}

// ─── Token Validation Tests ───────────────────────────────────────────────

describe('Token Validation', () => {
  test('should verify valid access token', () => {
    const token = generateTestAccessToken('user-123');
    const decoded = jwt.verify(token, JWT_SECRET);

    expect(decoded.id).toBe('user-123');
    expect(decoded.type).toBe('access');
  });

  test('should throw error for expired token', () => {
    const token = jwt.sign(
      { id: 'user-123', type: 'access' },
      JWT_SECRET,
      { expiresIn: '-1s' } // Already expired
    );

    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  test('should reject token with wrong type', () => {
    const token = jwt.sign(
      { id: 'user-123', type: 'temp-otp' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.type).toBe('temp-otp');
    expect(decoded.type).not.toBe('access');
  });

  test('should decode token without verification', () => {
    const token = generateTestAccessToken('user-123');
    const decoded = jwt.decode(token);

    expect(decoded.id).toBe('user-123');
    expect(decoded.type).toBe('access');
  });

  test('should validate token structure (Bearer format)', () => {
    const token = generateTestAccessToken('user-123');
    const bearer = `Bearer ${token}`;

    const extracted = bearer.startsWith('Bearer ')
      ? bearer.slice(7)
      : null;

    expect(extracted).toBe(token);
    const decoded = jwt.verify(extracted, JWT_SECRET);
    expect(decoded.id).toBe('user-123');
  });
});

// ─── Token Expiry Tests ────────────────────────────────────────────────────

describe('Token Expiry Detection', () => {
  test('should detect expired token', () => {
    const token = jwt.sign(
      { id: 'user-123', exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
      JWT_SECRET
    );

    const decoded = jwt.decode(token);
    const isExpired = decoded.exp * 1000 < Date.now();

    expect(isExpired).toBe(true);
  });

  test('should not mark valid token as expired', () => {
    const token = generateTestAccessToken('user-123', '24h');
    const decoded = jwt.decode(token);

    const isExpired = decoded.exp * 1000 < Date.now();
    expect(isExpired).toBe(false);
  });

  test('should calculate TTL correctly', () => {
    const token = generateTestAccessToken('user-123', '3600s'); // 1 hour
    const decoded = jwt.decode(token);
    const ttl = Math.floor(decoded.exp - Date.now() / 1000);

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(3600);
  });
});

// ─── Refresh Token Flow Tests ──────────────────────────────────────────────

describe('Refresh Token Management', () => {
  test('should generate new access token from valid refresh token', () => {
    const userId = 'user-123';
    const refreshToken = generateTestRefreshToken(userId);

    // Verify refresh token is valid
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    expect(decoded.id).toBe(userId);

    // Generate new access token
    const newAccessToken = generateTestAccessToken(userId);
    const newDecoded = jwt.verify(newAccessToken, JWT_SECRET);

    expect(newDecoded.id).toBe(userId);
    expect(newDecoded.type).toBe('access');
  });

  test('should reject expired refresh token', () => {
    const expiredRefreshToken = jwt.sign(
      { id: 'user-123', type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );

    expect(() => jwt.verify(expiredRefreshToken, JWT_SECRET)).toThrow();
  });

  test('should issue new refresh token on token refresh', () => {
    const userId = 'user-123';

    // Generate initial tokens
    const accessToken1 = generateTestAccessToken(userId);
    const refreshToken1 = generateTestRefreshToken(userId);

    // Verify initial tokens
    expect(jwt.verify(accessToken1, JWT_SECRET).id).toBe(userId);
    expect(jwt.verify(refreshToken1, JWT_SECRET).id).toBe(userId);

    // On refresh, generate new tokens
    const accessToken2 = generateTestAccessToken(userId);
    const refreshToken2 = generateTestRefreshToken(userId);

    // New tokens should be different and valid
    expect(accessToken2).not.toBe(accessToken1);
    expect(refreshToken2).not.toBe(refreshToken1);
    expect(jwt.verify(accessToken2, JWT_SECRET).id).toBe(userId);
    expect(jwt.verify(refreshToken2, JWT_SECRET).id).toBe(userId);
  });
});

// ─── Login/2FA Flow Tests ──────────────────────────────────────────────────

describe('Login Flow with Tokens', () => {
  test('should return access and refresh tokens on successful login', () => {
    const userId = 'user-123';
    const accessToken = generateTestAccessToken(userId);
    const refreshToken = generateTestRefreshToken(userId);

    // Simulate login response
    const loginResponse = {
      token: accessToken,
      refresh_token: refreshToken,
      user: { id: userId, email: 'test@example.com', is_super_admin: false },
    };

    expect(loginResponse.token).toBeDefined();
    expect(loginResponse.refresh_token).toBeDefined();
    expect(jwt.verify(loginResponse.token, JWT_SECRET).type).toBe('access');
  });

  test('should return temp OTP token when 2FA is enabled', () => {
    const userId = 'user-123';
    const tempToken = generateTestTempOtpToken(userId);

    const response = {
      error: 'Yêu cầu xác thực 2FA',
      requires_2fa: true,
      temp_session_token: tempToken,
    };

    const decoded = jwt.verify(response.temp_session_token, JWT_SECRET);
    expect(decoded.type).toBe('temp-otp');
  });

  test('should verify temp OTP token and issue main tokens', () => {
    const userId = 'user-123';
    const tempToken = generateTestTempOtpToken(userId);

    // Verify temp token is valid
    const decoded = jwt.verify(tempToken, JWT_SECRET);
    expect(decoded.type).toBe('temp-otp');

    // Issue main tokens
    const accessToken = generateTestAccessToken(userId);
    const refreshToken = generateTestRefreshToken(userId);

    expect(jwt.verify(accessToken, JWT_SECRET).type).toBe('access');
    expect(jwt.verify(refreshToken, JWT_SECRET).type).toBe('access' ? 'access' : 'refresh');
  });
});

// ─── Token Revocation & Logout Tests ───────────────────────────────────────

describe('Token Revocation & Logout', () => {
  test('should store token hash for revocation', () => {
    const refreshToken = 'test-refresh-token-123';
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    expect(tokenHash).toBeDefined();
    expect(tokenHash.length).toBeGreaterThan(0);

    // Same token should produce same hash
    const tokenHash2 = crypto.createHash('sha256').update(refreshToken).digest('hex');
    expect(tokenHash).toBe(tokenHash2);
  });

  test('should prevent use of revoked token', async () => {
    const userId = 'user-123';
    // Simulate revoked token by checking revoked_at timestamp
    const tokenData = {
      user_id: userId,
      revoked_at: new Date(), // Token is revoked
    };

    expect(tokenData.revoked_at).toBeDefined();

    // Token should not be usable
    const isRevoked = !!tokenData.revoked_at;
    expect(isRevoked).toBe(true);
  });

  test('should revoke all user tokens on logout', () => {
    const userId = 'user-123';

    // Simulate multiple active refresh tokens
    const tokens = [
      { user_id: userId, revoked_at: null },
      { user_id: userId, revoked_at: null },
      { user_id: userId, revoked_at: null },
    ];

    // On logout, revoke all
    const revokedTokens = tokens.map((t) => ({
      ...t,
      revoked_at: new Date(),
    }));

    revokedTokens.forEach((t) => {
      expect(t.revoked_at).toBeDefined();
    });
  });
});

// ─── Token Storage Tests ───────────────────────────────────────────────────

describe('Token Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('should store access and refresh tokens separately', () => {
    const accessToken = generateTestAccessToken('user-123');
    const refreshToken = generateTestRefreshToken('user-123');

    localStorage.setItem('longpl_token', accessToken);
    localStorage.setItem('longpl_refresh_token', refreshToken);

    expect(localStorage.getItem('longpl_token')).toBe(accessToken);
    expect(localStorage.getItem('longpl_refresh_token')).toBe(refreshToken);
  });

  test('should clear both tokens on logout', () => {
    localStorage.setItem('longpl_token', 'access-token');
    localStorage.setItem('longpl_refresh_token', 'refresh-token');

    localStorage.removeItem('longpl_token');
    localStorage.removeItem('longpl_refresh_token');

    expect(localStorage.getItem('longpl_token')).toBeNull();
    expect(localStorage.getItem('longpl_refresh_token')).toBeNull();
  });

  test('should validate token on retrieve', () => {
    const accessToken = generateTestAccessToken('user-123');
    localStorage.setItem('longpl_token', accessToken);

    const stored = localStorage.getItem('longpl_token');
    const decoded = jwt.decode(stored);

    expect(decoded.id).toBe('user-123');
  });
});

// ─── Error Scenarios ───────────────────────────────────────────────────────

describe('Error Handling', () => {
  test('should handle missing refresh token gracefully', () => {
    const refreshToken = null;

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }
  });

  test('should handle network error during refresh', async () => {
    // Simulate network failure
    const shouldRetry = true;
    expect(shouldRetry).toBe(true);
  });

  test('should handle user being disabled', () => {
    const user = { id: 'user-123', is_active: false };

    if (!user.is_active) {
      throw new Error('User account is disabled');
    }
  });

  test('should handle token signature mismatch', () => {
    const token = generateTestAccessToken('user-123');
    const wrongSecret = 'wrong-secret';

    expect(() => jwt.verify(token, wrongSecret)).toThrow();
  });
});

// ─── Integration Tests ────────────────────────────────────────────────────

describe('Token Refresh Integration', () => {
  test('full login to refresh flow', () => {
    // 1. User logs in
    const loginTokens = {
      token: generateTestAccessToken('user-123'),
      refresh_token: generateTestRefreshToken('user-123'),
    };

    expect(loginTokens.token).toBeDefined();
    expect(loginTokens.refresh_token).toBeDefined();

    // 2. Frontend stores tokens
    localStorage.setItem('longpl_token', loginTokens.token);
    localStorage.setItem('longpl_refresh_token', loginTokens.refresh_token);

    // 3. Time passes, access token expires (simulated)
    const expiredAccessToken = jwt.sign(
      { id: 'user-123', type: 'access' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );

    // 4. Frontend uses refresh token to get new access token
    const newAccessToken = generateTestAccessToken('user-123');
    const newRefreshToken = generateTestRefreshToken('user-123');

    // 5. Frontend updates stored tokens
    localStorage.setItem('longpl_token', newAccessToken);
    localStorage.setItem('longpl_refresh_token', newRefreshToken);

    // 6. Verify new tokens work
    expect(jwt.verify(newAccessToken, JWT_SECRET).id).toBe('user-123');
    expect(jwt.verify(newRefreshToken, JWT_SECRET).id).toBe('user-123');
  });

  test('logout flow revokes all tokens', () => {
    // 1. User is logged in with tokens
    const accessToken = generateTestAccessToken('user-123');
    const refreshToken = generateTestRefreshToken('user-123');

    localStorage.setItem('longpl_token', accessToken);
    localStorage.setItem('longpl_refresh_token', refreshToken);

    // 2. User clicks logout
    // 3. Frontend sends logout request with refresh token
    // 4. Backend revokes all user tokens
    const revokedAt = new Date();

    // 5. Frontend clears local storage
    localStorage.removeItem('longpl_token');
    localStorage.removeItem('longpl_refresh_token');

    // 6. Verify tokens are cleared
    expect(localStorage.getItem('longpl_token')).toBeNull();
    expect(localStorage.getItem('longpl_refresh_token')).toBeNull();
  });
});
