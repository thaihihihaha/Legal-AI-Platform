import { prisma } from '../lib/prisma.js';

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Re-check is_active + role từ DB (không tin payload JWT 24h cũ).
// Refresh req.user.role/is_active/company_id để các middleware sau dùng giá trị mới.
export const requireActive = () => async (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { is_active: true, role: true, company_id: true },
    });
    if (!dbUser) return res.status(401).json({ error: 'Tài khoản không còn tồn tại' });
    if (!dbUser.is_active) return res.status(403).json({ error: 'Your account is disabled' });

    req.user.is_active = dbUser.is_active;
    req.user.role = dbUser.role;
    req.user.company_id = dbUser.company_id;
    req.user.companyId = dbUser.company_id;
    next();
  } catch (error) {
    console.error('requireActive DB check failed:', error);
    return res.status(500).json({ error: 'Không thể xác thực trạng thái tài khoản.' });
  }
};

// Backward compatibility - chỉ còn admin > member
export const requireMinimumRole = (minimumRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (minimumRole === 'admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permission required' });
  }
  next();
};

// Kept for import compatibility - hoạt động giống requireRole('admin')
export const requireSuperAdmin = () => requireRole('admin');
