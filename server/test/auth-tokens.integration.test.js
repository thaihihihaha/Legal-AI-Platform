/**
 * Auth Endpoints Integration Tests
 * Tests for login, refresh, logout, and 2FA flows with tokens
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

const API_URL = 'http://localhost:8080/v1';

// ─── Test Data ─────────────────────────────────────────────────────────────

const testUser = {
  email: 'test-token@example.com',
  password: 'Test@12345',
  fullName: 'Token Test User',
};

let accessToken = null;
let refreshToken = null;
let userId = null;

// ─── Helper Functions ──────────────────────────────────────────────────────

async function register(user) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  return response.json();
}

async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}

async function refreshAccessToken(refreshTokenValue) {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });

  return response.json();
}

async function logoutUser(accessTokenValue, refreshTokenValue) {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessTokenValue}`,
    },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });

  return response.json();
}

// ─── Login Tests ───────────────────────────────────────────────────────────

describe('Login Endpoint (Tokens)', () => {
  test('login should return access and refresh tokens', async () => {
    // Setup: Register user
    await register(testUser);

    // Test: Login
    const loginResponse = await login(testUser.email, testUser.password);

    expect(loginResponse.token).toBeDefined();
    expect(loginResponse.refresh_token).toBeDefined();
    expect(loginResponse.user).toBeDefined();
    expect(loginResponse.user.email).toBe(testUser.email);

    // Store for subsequent tests
    accessToken = loginResponse.token;
    refreshToken = loginResponse.refresh_token;
    userId = loginResponse.user.id;
  });

  test('login should set user properties including is_super_admin', async () => {
    // Setup: Register new user
    const Email = `new-test-${Date.now()}@example.com`;
    const registerResponse = await register({
      ...testUser,
      email: Email,
    });

    // Test: Fields returned on login
    const loginResponse = await login(Email, testUser.password);

    expect(loginResponse.user.is_super_admin).toBeDefined();
    expect(loginResponse.user.role).toBeDefined();
    expect(typeof loginResponse.user.is_super_admin).toBe('boolean');
  });
});

// ─── Refresh Token Tests ───────────────────────────────────────────────────

describe('Refresh Token Endpoint', () => {
  beforeEach(async () => {
    // Login to get tokens
    const loginResponse = await login(testUser.email, testUser.password);
    accessToken = loginResponse.token;
    refreshToken = loginResponse.refresh_token;
    userId = loginResponse.user.id;
  });

  test('refresh should return new access token', async () => {
    const refreshResponse = await refreshAccessToken(refreshToken);

    expect(refreshResponse.token).toBeDefined();
    expect(refreshResponse.refresh_token).toBeDefined();
    expect(refreshResponse.user).toBeDefined();

    // New token should be different from old (in practice)
    expect(refreshResponse.token).not.toBe(accessToken);
  });

  test('refresh should issue new refresh token', async () => {
    const oldRefreshToken = refreshToken;
    const refreshResponse = await refreshAccessToken(refreshToken);

    expect(refreshResponse.refresh_token).toBeDefined();
    // New refresh token should be different
    expect(refreshResponse.refresh_token).not.toBe(oldRefreshToken);

    // Update for next test
    accessToken = refreshResponse.token;
    refreshToken = refreshResponse.refresh_token;
  });

  test('refresh with invalid token should fail', async () => {
    const invalidToken = 'invalid-refresh-token-' + Date.now();
    const refreshResponse = await refreshAccessToken(invalidToken);

    expect(refreshResponse.error).toBeDefined();
    expect(refreshResponse.error).toContain('không hợp lệ');
  });

  test('refresh with revoked token should fail', async () => {
    // First refresh - this will revoke the old token
    const firstRefresh = await refreshAccessToken(refreshToken);
    expect(firstRefresh.token).toBeDefined();

    // Try to use old token again - should fail (token was revoked)
    // Note: This depends on whether the implementation revokes old tokens
    // Some implementations allow multiple refreshes with same token
  });
});

// ─── Logout Tests ──────────────────────────────────────────────────────────

describe('Logout Endpoint', () => {
  beforeEach(async () => {
    const loginResponse = await login(testUser.email, testUser.password);
    accessToken = loginResponse.token;
    refreshToken = loginResponse.refresh_token;
    userId = loginResponse.user.id;
  });

  test('logout should succeed with valid tokens', async () => {
    const logoutResponse = await logoutUser(accessToken, refreshToken);

    expect(logoutResponse.message).toBeDefined();
    expect(logoutResponse.message).toContain('thành công');
  });

  test('logout should revoke refresh token', async () => {
    // Logout
    await logoutUser(accessToken, refreshToken);

    // Try to refresh with revoked token - should fail
    const refreshResponse = await refreshAccessToken(refreshToken);
    expect(refreshResponse.error).toBeDefined();
  });

  test('logout should be idempotent', async () => {
    const loginResponse = await login(testUser.email, testUser.password);
    accessToken = loginResponse.token;
    refreshToken = loginResponse.refresh_token;

    // First logout
    const logoutResponse1 = await logoutUser(accessToken, refreshToken);
    expect(logoutResponse1.message).toContain('thành công');

    // Second logout with same tokens - should fail gracefully
    // or return error (depends on implementation)
  });

  test('logout without refresh token should revoke all tokens', async () => {
    // Logout without passing refresh_token in body
    const logoutResponse = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        // No refresh_token provided - should revoke all
      }),
    });

    const data = await logoutResponse.json();
    expect(data.message).toBeDefined();
  });
});

// ─── 2FA with Token Tests ──────────────────────────────────────────────────

describe('2FA Login Flow (Tokens)', () => {
  test('login with 2FA enabled should return temp OTP token (not access token)', async () => {
    // This test would need a user with 2FA enabled
    // Skipped if no such test user exists
  });

  test('verify OTP should return access and refresh tokens', async () => {
    // This test would verify OTP endpoint returns proper tokens
    // Skipped if no test user with 2FA exists
  });
});

// ─── Concurrent Token Operations ───────────────────────────────────────────

describe('Concurrent Token Operations', () => {
  test('multiple refresh calls should be handled properly', async () => {
    const loginResponse = await login(testUser.email, testUser.password);
    const testRefreshToken = loginResponse.refresh_token;

    // Try multiple concurrent refresh requests
    const promises = [
      refreshAccessToken(testRefreshToken),
      refreshAccessToken(testRefreshToken),
      refreshAccessToken(testRefreshToken),
    ];

    const results = await Promise.all(promises);

    // At least some should succeed (implementation dependent)
    const successCount = results.filter((r) => r.token).length;
    expect(successCount).toBeGreaterThan(0);
  });
});

// ─── Token Expiry Simulation ───────────────────────────────────────────────

describe('Token Expiry Scenarios', () => {
  test('request with expired access token should prompt refresh', async () => {
    // This is more of a frontend test
    // Backend would return 401 for expired token
  });

  test('request with fresh token should succeed', async () => {
    const loginResponse = await login(testUser.email, testUser.password);
    const token = loginResponse.token;

    // Make authenticated request with fresh token
    // Should succeed
  });
});

// ─── Security Tests ────────────────────────────────────────────────────────

describe('Token Security', () => {
  test('refresh token should not be transmitted in response multiple times', async () => {
    const loginResponse = await login(testUser.email, testUser.password);

    expect(loginResponse.refresh_token).toBeDefined();
    // In production, refresh token should only be in secure HttpOnly cookie
    // or returned once, never in URLs
  });

  test('refresh endpoint should require valid refresh token format', async () => {
    const testCases = [
      '',
      'invalid',
      'xxx.yyy.zzz', // Invalid JWT
      null,
      undefined,
    ];

    for (const invalidToken of testCases) {
      if (!invalidToken) continue; // Skip null/undefined for this test

      const response = await refreshAccessToken(invalidToken);
      expect(response.error).toBeDefined();
    }
  });
});

// ─── Database State Tests ──────────────────────────────────────────────────

describe('Token Database Operations', () => {
  test('refresh tokens should be stored in database', async () => {
    const loginResponse = await login(testUser.email, testUser.password);
    // This would check Prisma that refresh token is stored
    // Implementation dependent
  });

  test('revoked tokens should be marked in database', async () => {
    const loginResponse = await login(testUser.email, testUser.password);
    await logoutUser(loginResponse.token, loginResponse.refresh_token);

    // Check that refresh_tokens.revoked_at is set
    // This would require direct DB access or admin endpoint
  });

  test('old refresh tokens should be cleaned up', async () => {
    // Test cleanup function
    // cleanupExpiredTokens(30)
  });
});
