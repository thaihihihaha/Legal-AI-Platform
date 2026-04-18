import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Đăng ký người dùng
router.post('/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Tài khoản đã tồn tại' });

    const passwordHash = await bcrypt.hash(password, 10);
    const baseSlug = (fullName || email.split('@')[0] || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'workspace';

    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: `${fullName || email} Workspace`,
          slug,
        },
      });

      return tx.user.create({
        data: {
          company_id: company.id,
          email,
          password_hash: passwordHash,
          full_name: fullName || 'User mới',
        },
      });
    });

    res.json({ message: 'Đăng ký thành công', userId: user.id, companyId: user.company_id || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi đăng ký tài khoản' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Sai mật khẩu' });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        companyId: user.company_id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.full_name } });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

export default router;
