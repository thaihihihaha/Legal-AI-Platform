export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

export const requireActive = () => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.is_active) return res.status(403).json({ error: 'Your account is disabled' });
  next();
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
