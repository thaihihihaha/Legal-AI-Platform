/**
 * Role-based permission checks
 * Defines which roles can perform which actions
 */

/**
 * Role Hierarchy: owner (4) > admin (3) > member (2) > viewer (1)
 * Used for permission enforcement
 */
export const roleHierarchy = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Get numeric level for a role
 */
export const getRoleLevel = (role) => roleHierarchy[role] || 0;

/**
 * Check if user has at least minimum role level
 */
export const hasMinimumRole = (userRole, minimumRole) => {
  return getRoleLevel(userRole) >= getRoleLevel(minimumRole);
};

/**
 * Permission matrix: action -> minimum required role
 * Used for different operations
 */
export const actionPermissions = {
  // Read operations (open to most)
  'view:documents': 'viewer',          // List, read documents
  'view:contracts': 'viewer',          // List, read contracts
  'view:legal_ai': 'viewer',           // Ask legal questions
  'view:analytics': 'member',          // View risk summaries, analytics
  'view:audit_logs': 'admin',          // View audit logs

  // Write operations (need member+)
  'upload:documents': 'member',        // Upload documents
  'upload:contracts': 'member',        // Upload contracts
  'create:tags': 'member',             // Create tags
  'create:categories': 'member',       // Create categories
  'create:templates': 'member',        // Create custom templates
  'edit:documents': 'member',          // Edit own/company documents
  'edit:contracts': 'member',          // Edit own/company contracts
  'edit:tags': 'member',               // Edit tags
  'edit:categories': 'member',         // Edit categories
  'edit:templates': 'member',          // Edit custom templates
  'parse:documents': 'member',         // Parse metadata
  'analyze:documents': 'member',       // Request AI analysis

  // Approval/Review operations (need admin+)
  'review:contracts': 'admin',         // AI review contracts
  'approve:documents': 'admin',        // Approve documents
  'publish:documents': 'admin',        // Publish documents

  // Delete operations (need admin+)
  'delete:documents': 'admin',         // Delete documents
  'delete:contracts': 'admin',         // Delete contracts
  'delete:tags': 'admin',              // Delete tags
  'delete:categories': 'admin',        // Delete categories
  'delete:templates': 'member',        // Delete custom templates

  // Settings (admin+ only)
  'manage:api_keys': 'admin',          // Create/edit/delete API keys
  'manage:settings': 'admin',          // Company settings
  'manage:users': 'admin',             // (This is handled by superAdmin middleware separately)
};

/**
 * Check if user can perform an action
 * @param {string} userRole - User's role
 * @param {string} action - Action from actionPermissions
 * @param {Object} context - Additional context (userId, uploadedBy, etc.)
 * @returns {boolean}
 */
export const canPerformAction = (userRole, action, context = {}) => {
  const minimumRole = actionPermissions[action];
  if (!minimumRole) {
    console.warn(`Unknown action: ${action}`);
    return false;
  }

  return hasMinimumRole(userRole, minimumRole);
};

/**
 * Middleware factory: Require specific action permission
 * Usage: router.post('/upload', requireAction('upload:contracts'), handler)
 * @param {string} action
 * @returns {Function} Express middleware
 * 
 * Note: Owner and SuperAdmin roles bypass all permissions (have full access)
 */
export const requireAction =
  (action) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // ✨ Owner and SuperAdmin bypass: They have full access to all actions
    if (req.user.role === 'owner' || req.user.is_super_admin) {
      return next();
    }

    if (!canPerformAction(req.user.role, action)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_role: actionPermissions[action],
        user_role: req.user.role,
      });
    }

    next();
  };

/**
 * Require one of multiple actions (OR logic)
 * Usage: router.delete('/:id', requireActionAny('delete:documents', 'owner:document'), handler)
 * 
 * Note: Owner and SuperAdmin bypass - they have full access
 */
export const requireActionAny =
  (...actions) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // ✨ Owner and SuperAdmin bypass: They have full access to all actions
    if (req.user.role === 'owner' || req.user.is_super_admin) {
      return next();
    }

    const hasPermission = actions.some((action) => canPerformAction(req.user.role, action));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_actions: actions,
        user_role: req.user.role,
      });
    }

    next();
  };

/**
 * Check if user is document/resource owner or admin
 * Useful for PATCH/DELETE where users can modify their own but admins can modify any
 * Usage: await checkOwnershipOrAdmin(req, userId, 'contract')
 * 
 * Note: Owner and SuperAdmin have full access to all resources
 */
export const checkOwnershipOrAdmin = async (req, resourceOwnerId) => {
  if (!req.user) return false;

  // ✨ Owner and SuperAdmin can access anything
  if (req.user.role === 'owner' || req.user.is_super_admin) {
    return true;
  }

  // Admins can do anything
  if (hasMinimumRole(req.user.role, 'admin')) {
    return true;
  }

  // Owner can only modify their own
  return req.user.id === resourceOwnerId;
};

/**
 * List allowed roles for a specific action
 * @param {string} action
 * @returns {string[]} Array of roles that can perform this action
 */
export const getAllowedRoles = (action) => {
  const minimumRole = actionPermissions[action];
  if (!minimumRole) return [];

  const minLevel = getRoleLevel(minimumRole);
  return Object.entries(roleHierarchy)
    .filter(([, level]) => level >= minLevel)
    .map(([role]) => role);
};
