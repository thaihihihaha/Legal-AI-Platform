/**
 * Require specific roles
 * @param {...string} allowedRoles - Roles that can proceed (owner, admin, member, viewer)
 * @returns {Function} Express middleware
 */
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
};

/**
 * Require super admin status
 * @returns {Function} Express middleware
 */
export const requireSuperAdmin = () => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  next();
};

/**
 * Require user to be active (not disabled)
 * @returns {Function} Express middleware
 */
export const requireActive = () => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.user.is_active) {
    return res.status(403).json({ error: 'Your account is disabled' });
  }

  next();
};

/**
 * Require role with hierarchy: owner > admin > member > viewer
 * @param {string} minimumRole
 * @returns {Function} Express middleware
 */
export const requireMinimumRole = (minimumRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const roleHierarchy = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[req.user.role] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;

  if (userLevel < requiredLevel) {
    return res.status(403).json({ error: `${minimumRole} or higher permission required` });
  }

  next();
};
