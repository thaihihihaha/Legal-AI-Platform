import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { generateTotpSecret, verifyTotpToken, enableTOTP } from '../services/twoFactorService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone_number: true,
        role: true,
        totp_enabled: true,
        created_at: true,
        last_login_at: true,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/', async (req, res) => {
  try {
    const { full_name, phone_number } = req.body;
    const data = { updated_at: new Date() };
    if (full_name !== undefined) data.full_name = full_name;
    if (phone_number !== undefined) data.phone_number = phone_number;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, full_name: true, phone_number: true },
    });
    res.json({ message: 'Cập nhật thông tin thành công', user: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password_hash: passwordHash, updated_at: new Date() },
    });

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/setup-2fa', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true },
    });
    const { secret, qrCodeUrl, manualEntryKey } = await generateTotpSecret(user.email);
    res.json({ secret: manualEntryKey, qr_code: qrCodeUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify-2fa', async (req, res) => {
  try {
    const { secret, otp_token } = req.body;
    if (!secret || !otp_token) {
      return res.status(400).json({ error: 'Secret và mã OTP là bắt buộc' });
    }
    const isValid = verifyTotpToken(secret, otp_token);
    if (!isValid) {
      return res.status(401).json({ error: 'Mã OTP không đúng hoặc đã hết hạn' });
    }
    await enableTOTP(prisma, req.user.id, secret);
    res.json({ message: '2FA đã được kích hoạt thành công', totp_enabled: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/disable-2fa', async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: 'Mật khẩu là bắt buộc để tắt 2FA' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu không đúng' });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { totp_enabled: false, totp_secret: null, updated_at: new Date() },
    });
    res.json({ message: '2FA đã bị tắt', totp_enabled: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
