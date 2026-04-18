import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserDetails,
  resetUserPassword,
  disableUser,
  enableUser,
  setUserRole,
  disable2FA,
  setAsSuperAdmin,
  createInvitation,
  getPendingInvitations,
  cancelInvitation,
  verifyInvitationToken,
  markInvitationUsed,
} from '../services/userService.js';
import { logAction, getAuditLogs } from '../lib/auditLog.js';
import { requireSuperAdmin } from '../middleware/requireRole.js';

const router = express.Router();

// Apply super admin check to all admin routes
router.use(requireSuperAdmin());

/**
 * GET /admin/users
 * List all users with filters
 */
router.get('/users', async (req, res) => {
  try {
    const { search, role, is_active } = req.query;

    const users = await getAllUsers({
      search,
      role,
      is_active,
    });

    res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/users/:id
 * Get specific user details
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User không tìm thấy' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /admin/users/:id
 * Update user details (name, email, phone, role)
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { full_name, email, phone_number, role } = req.body;

    const userBefore = await getUserById(req.params.id);

    const updatedUser = await updateUserDetails(req.params.id, {
      full_name,
      email,
      phone_number,
      role,
    });

    // Log the change
    await logAction({
      actor_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'USER',
      resource_id: req.params.id,
      company_id: req.user.company_id,
      changes: {
        before: userBefore,
        after: updatedUser,
      },
    });

    res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/reset-password
 * Generate temporary password for user
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { userId, tempPassword } = await resetUserPassword(req.params.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'RESET_PASSWORD',
      resource_type: 'USER',
      resource_id: userId,
      company_id: req.user.company_id,
    });

    res.json({
      message: 'Password reset thành công',
      tempPassword, // Send once - user must save it
      userId,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/disable
 * Disable user account (prevent login)
 */
router.post('/users/:id/disable', async (req, res) => {
  try {
    const disabledUser = await disableUser(req.params.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'DISABLE',
      resource_type: 'USER',
      resource_id: req.params.id,
      company_id: req.user.company_id,
      changes: { is_active: false },
    });

    res.json({ message: 'User đã bị vô hiệu hóa', user: disabledUser });
  } catch (error) {
    console.error('Error disabling user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/enable
 * Enable user account (allow login)
 */
router.post('/users/:id/enable', async (req, res) => {
  try {
    const enabledUser = await enableUser(req.params.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'ENABLE',
      resource_type: 'USER',
      resource_id: req.params.id,
      company_id: req.user.company_id,
      changes: { is_active: true },
    });

    res.json({ message: 'User đã được kích hoạt', user: enabledUser });
  } catch (error) {
    console.error('Error enabling user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/set-role
 * Change user's role
 */
router.post('/users/:id/set-role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const updated = await setUserRole(req.params.id, role);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'SET_ROLE',
      resource_type: 'USER',
      resource_id: req.params.id,
      company_id: req.user.company_id,
      changes: { role },
    });

    res.json({ message: 'Vai trò đã cập nhật', user: updated });
  } catch (error) {
    console.error('Error setting role:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/disable-2fa
 * Disable 2FA for user (admin override)
 */
router.post('/users/:id/disable-2fa', async (req, res) => {
  try {
    const disabled = await disable2FA(req.params.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'DISABLE_2FA',
      resource_type: 'USER',
      resource_id: req.params.id,
      company_id: req.user.company_id,
      changes: { totp_enabled: false },
    });

    res.json({ message: '2FA đã bị vô hiệu hóa', user: disabled });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/set-super-admin
 * Promote user to super admin
 */
router.post('/users/:id/set-super-admin', async (req, res) => {
  try {
    const promoted = await setAsSuperAdmin(req.params.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'PROMOTE_SUPER_ADMIN',
      resource_type: 'USER',
      resource_id: req.params.id,
      company_id: req.user.company_id,
      changes: { is_super_admin: true },
    });

    res.json({ message: 'User promoted to super admin', user: promoted });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/invitations
 * Create invitation for new user
 */
router.post('/invitations', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role required' });
    }

    const invitation = await createInvitation(email, role, req.user.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'CREATE_INVITATION',
      resource_type: 'INVITATION',
      resource_id: invitation.id,
      company_id: req.user.company_id,
      changes: { email, role },
    });

    // Generate invitation URL (frontend will handle this)
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invitation?token=${invitation.token}`;

    res.json({
      message: 'Lời mời đã được tạo',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        invitationUrl,
      },
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/invitations
 * Get all pending invitations
 */
router.get('/invitations', async (req, res) => {
  try {
    const invitations = await getPendingInvitations();

    res.json({
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /admin/invitations/:id
 * Cancel invitation
 */
router.delete('/invitations/:id', async (req, res) => {
  try {
    await cancelInvitation(req.params.id);

    // Log the action
    await logAction({
      actor_id: req.user.id,
      action: 'CANCEL_INVITATION',
      resource_type: 'INVITATION',
      resource_id: req.params.id,
      company_id: req.user.company_id,
    });

    res.json({ message: 'Lời mời đã bị hủy' });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/audit-logs
 * Get audit logs with filters
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { actor_id, resource_type, action, limit = 100, offset = 0 } = req.query;

    const logs = await getAuditLogs({
      actor_id,
      resource_type,
      action,
      company_id: req.user.company_id,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
