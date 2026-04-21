import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { generateTotpSecret, verifyTotpToken, enableTOTP } from '../services/twoFactorService.js';
import {
  generateAccessToken,
  generateTempSessionToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  verifyToken,
} from '../services/tokenService.js';

const router = Router();

// ─── Token Generation (kept for backward compatibility) ──────────────────────

/**
 * @deprecated Use tokenService.generateAccessToken instead
 */
const generateMainToken = (user) => {
  return generateAccessToken(user);
};

// Đăng ký người dùng
// Đăng ký người dùng đã bị tắt (Chỉ Admin mới có quyền tạo)
router.post("/register", (req, res) => {
  res.status(403).json({ error: "Chức năng đăng ký tự do đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên để được cấp tài khoản." });
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hoá' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Sai mật khẩu' });

    // Update last_login_at
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // Check if 2FA is enabled
    if (user.totp_enabled && user.totp_secret) {
      // Generate temporary session token for OTP verification
      const temp_session_token = generateTempSessionToken(user.id, user.email);
      return res.status(401).json({
        error: 'Yêu cầu xác thực 2FA',
        requires_2fa: true,
        temp_session_token, // Client uses this to verify OTP
      });
    }

    // 2FA not enabled - return main JWT + refresh token
    const accessToken = generateMainToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.json({
      token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        is_super_admin: user.role === 'admin',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message || error);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  }
});

// ─── 2FA Routes ──────────────────────────────────────────────────────────────

/**
 * POST /auth/setup-2fa
 * Generate TOTP secret + QR code (không enable chưa)
 * Yêu cầu: Bearer token (logged in user)
 */
router.post('/setup-2fa', async (req, res) => {
  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Cần đăng nhập' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc hết hạn' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, totp_enabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }

    // Generate new TOTP secret
    const { secret, qrCodeUrl, manualEntryKey } = await generateTotpSecret(user.email);

    res.json({
      message: 'TOTP secret generated',
      secret: manualEntryKey, // For manual entry
      qr_code: qrCodeUrl, // Data URL for QR code
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Lỗi tạo 2FA' });
  }
});

/**
 * POST /auth/verify-2fa-setup
 * Verify OTP token trước khi enable 2FA (security check)
 * Body: { secret, otp_token }
 * Yêu cầu: Bearer token
 */
router.post('/verify-2fa-setup', async (req, res) => {
  try {
    const { secret, otp_token } = req.body;
    if (!secret || !otp_token) {
      return res.status(400).json({ error: 'Secret và OTP token bắt buộc' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Cần đăng nhập' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc hết hạn' });
    }

    // Verify OTP token
    const isValid = verifyTotpToken(secret, otp_token);
    if (!isValid) {
      return res.status(401).json({ error: 'OTP không đúng' });
    }

    // Enable TOTP for user
    await enableTOTP(prisma, decoded.id, secret);

    res.json({
      message: '2FA enabled thành công',
      totp_enabled: true,
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Lỗi xác thực 2FA' });
  }
});

/**
 * POST /auth/verify-otp
 * Verify OTP code trong quá trình login
 * Body: { otp_token, temp_session_token }
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp_token, temp_session_token } = req.body;
    if (!otp_token || !temp_session_token) {
      return res.status(400).json({ error: 'OTP token và temp session token bắt buộc' });
    }

    // Verify temp session token
    let decoded;
    try {
      decoded = jwt.verify(temp_session_token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Temp session expired, vui lòng login lại' });
    }

    if (decoded.type !== 'temp-otp') {
      return res.status(401).json({ error: 'Invalid temp token' });
    }

    // Get user with TOTP secret
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        totp_secret: true,
        totp_enabled: true,
        role: true,
        company_id: true,
      },
    });

    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(401).json({ error: 'TOTP không được bật' });
    }

    // Verify OTP token
    const isValid = verifyTotpToken(user.totp_secret, otp_token);
    if (!isValid) {
      return res.status(401).json({ error: 'OTP không đúng hoặc hết hạn' });
    }

    // Generate main JWT token
    const mainToken = generateMainToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.json({
      token: mainToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        is_super_admin: user.role === 'admin',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Lỗi xác thực OTP' });
  }
});

// ─── Token Refresh & Revocation ───────────────────────────────────────────────

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * Body: { refresh_token }
 * Returns: new access_token + refresh_token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify and get user from refresh token
    const user = await verifyRefreshToken(refresh_token);
    if (!user) {
      return res.status(401).json({ error: 'Refresh token không hợp lệ, vui lòng login lại' });
    }

    // Check if user is still active
    if (!user.is_active) {
      // Revoke all tokens for this user
      await revokeAllUserTokens(user.id);
      return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hoá' });
    }

    // Generate new access token + new refresh token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user.id);

    // Revoke old refresh token
    await revokeRefreshToken(refresh_token);

    res.json({
      token: newAccessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        is_super_admin: user.role === 'admin',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Lỗi refresh token' });
  }
});

/**
 * POST /auth/logout
 * Revoke all refresh tokens for user
 * Body: { refresh_token } (optional - if provided, revoke only that token)
 * Header: Authorization: Bearer <access_token> (to get user ID)
 */
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Cần đăng nhập' });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token, 'access');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    // Revoke all tokens or specific token
    if (refresh_token) {
      // Revoke specific refresh token
      await revokeRefreshToken(refresh_token);
    } else {
      // Revoke all user's refresh tokens
      await revokeAllUserTokens(decoded.id);
    }

    res.json({
      message: 'Logout thành công',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Lỗi logout' });
  }
});

export default router;

