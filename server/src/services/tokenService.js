import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Token Service - Manage access tokens and refresh tokens
 */

// ─── Token Generation ──────────────────────────────────────────────────────────

/**
 * Generate main access token (short-lived)
 * TTL: 24 hours
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      companyId: user.company_id || null,
      is_active: user.is_active !== false,
      role: user.role || 'member',
      type: 'access',
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Generate temporary session token for 2FA verification
 * TTL: 5 minutes
 */
export const generateTempSessionToken = (userId, email) => {
  return jwt.sign(
    {
      id: userId,
      email,
      type: 'temp-otp',
    },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};

/**
 * Generate refresh token (long-lived)
 * TTL: 7 days
 * Stored in database for revocation
 */
export const generateRefreshToken = async (userId) => {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  });

  return refreshToken;
};

// ─── Token Validation ──────────────────────────────────────────────────────────

/**
 * Verify and decode JWT token
 * Returns decoded token or null if invalid
 */
export const verifyToken = (token, tokenType = 'access') => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token type if specified
    if (tokenType && decoded.type !== tokenType) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
};

/**
 * Get time until token expiry (in seconds)
 */
export const getTokenTTL = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) return -1;
  return Math.floor(decoded.exp - Date.now() / 1000);
};

// ─── Refresh Token Management ──────────────────────────────────────────────────

/**
 * Verify refresh token against database
 * Returns user if valid, null otherwise
 */
export const verifyRefreshToken = async (refreshToken) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    // Check if token exists, not revoked, and not expired
    if (!storedToken || storedToken.revoked_at || new Date() > storedToken.expires_at) {
      return null;
    }

    return storedToken.user;
  } catch (error) {
    console.error('Refresh token verification error:', error);
    return null;
  }
};

/**
 * Revoke a refresh token
 */
export const revokeRefreshToken = async (refreshToken) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.update({
      where: { token_hash: tokenHash },
      data: { revoked_at: new Date() },
    });

    return true;
  } catch (error) {
    console.error('Revoke token error:', error);
    return false;
  }
};

/**
 * Revoke all refresh tokens for a user (logout)
 */
export const revokeAllUserTokens = async (userId) => {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error('Revoke all tokens error:', error);
    return false;
  }
};

/**
 * Clean up expired refresh tokens (maintenance)
 */
export const cleanupExpiredTokens = async (daysOld = 30) => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000),
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error('Cleanup tokens error:', error);
    return 0;
  }
};

// ─── Token Validation Helpers ──────────────────────────────────────────────────

/**
 * Decode token without verification (use carefully!)
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

/**
 * Check if token should be refreshed (within 24 hours of expiry)
 * Useful for frontend to proactively refresh
 */
export const shouldRefreshToken = (token) => {
  const ttl = getTokenTTL(token);
  // Refresh if token expires within 1 hour
  return ttl > 0 && ttl < 3600;
};
