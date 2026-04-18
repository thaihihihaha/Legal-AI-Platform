import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/**
 * Generate TOTP secret và QR code cho user
 * @param {string} email - user email
 * @param {string} appName - app name (default: "AI Legal Agent")
 * @returns {Promise<{secret: string, qrCodeUrl: string}>}
 */
export const generateTotpSecret = async (email, appName = 'AI Legal Agent') => {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32, // 256-bit secret
  });

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32, // Secret key to show to user
    qrCodeUrl, // QR code data URL
    manualEntryKey: secret.base32, // Also return the raw key for manual entry
  };
};

/**
 * Verify TOTP token (OTP code from authenticator)
 * @param {string} secret - TOTP secret (base32)
 * @param {string} token - OTP token (6 digits)
 * @param {number} window - Number of time windows to check (default: 1 = ±30 seconds)
 * @returns {boolean}
 */
export const verifyTotpToken = (secret, token, window = 1) => {
  if (!secret || !token) return false;

  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: String(token).trim(),
      window, // Check current ±1 time windows (30 sec each)
    });

    return verified === true;
  } catch (error) {
    console.error('TOTP verification error:', error.message);
    return false;
  }
};

/**
 * Enable TOTP 2FA for user (call after OTP verification in setup)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - User ID
 * @param {string} secret - TOTP secret
 * @returns {Promise<User>}
 */
export const enableTOTP = async (prisma, userId, secret) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      totp_secret: secret,
      totp_enabled: true,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      totp_enabled: true,
    },
  });
};

/**
 * Disable TOTP 2FA for user (admin command)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - User ID
 * @returns {Promise<User>}
 */
export const disableTOTP = async (prisma, userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      totp_secret: null,
      totp_enabled: false,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      totp_enabled: true,
    },
  });
};

/**
 * Check if user has TOTP enabled
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const isTotpEnabled = async (prisma, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totp_enabled: true },
  });

  return user?.totp_enabled || false;
};
