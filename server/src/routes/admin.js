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
  createUserByAdmin,
  hardDeleteUser,
  getOrphanedAssets,
  reassignAssets,
  deleteOrphanedAssets,
} from '../services/userService.js';
import { logAction, getAuditLogs } from '../lib/auditLog.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Chỉ cho phép admin role truy cập
router.use(requireRole('admin'));

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
 * POST /admin/users
 * Tạo người dùng mới bởi admin
 */
router.post('/users', async (req, res) => {
  try {
    const { email, password, full_name, role, phone_number } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email và họ tên là bắt buộc' });
    }

    const newUser = await createUserByAdmin(req.user.company_id, {
      email, password, full_name, role, phone_number,
    });

    await logAction({
      actor_id: req.user.id,
      action: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: newUser.id,
      company_id: req.user.company_id,
      changes: { email, role, full_name },
    });

    res.json({ message: 'Tạo người dùng thành công', user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
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
 * DELETE /admin/users/:id
 * Xóa người dùng mềm (soft delete) - tài liệu vẫn được giữ lại
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Không thể tự xóa chính mình' });
    }

    const deletedId = req.params.id;
    await hardDeleteUser(deletedId);

    await logAction({
      actor_id: req.user.id,
      action: 'DELETE_USER',
      resource_type: 'USER',
      resource_id: deletedId,
      company_id: req.user.company_id,
    });

    res.json({ message: 'Người dùng đã bị xóa. Tài liệu của họ đã được chuyển vào kho lưu trữ.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/users/:id/reset-password
 * Generate temporary password for user
 */
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const { userId } = await resetUserPassword(req.params.id, newPassword);

    await logAction({
      actor_id: req.user.id,
      action: 'RESET_PASSWORD',
      resource_type: 'USER',
      resource_id: userId,
      company_id: req.user.company_id,
    });

    res.json({ message: 'Đặt lại mật khẩu thành công', userId });
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
 * GET /admin/orphaned-assets
 * Lấy các tài sản của người dùng bị xóa
 */
router.get('/orphaned-assets', async (req, res) => {
  try {
    const assets = await getOrphanedAssets();
    res.json(assets);
  } catch (error) {
    console.error('Error fetching orphaned assets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/orphaned-assets/reassign
 * Chuyển nhượng tài liệu của người đã bị xóa sang người dùng khác
 */
router.post('/orphaned-assets/reassign', async (req, res) => {
  try {
    const { assetType, assetIds, newUserId } = req.body;
    if (!assetType || !assetIds?.length || !newUserId) {
      return res.status(400).json({ error: 'assetType, assetIds và newUserId là bắt buộc' });
    }
    await reassignAssets(assetType, assetIds, newUserId);

    await logAction({
      actor_id: req.user.id,
      action: 'REASSIGN_ASSETS',
      resource_type: assetType.toUpperCase(),
      company_id: req.user.company_id,
      changes: { assetIds, newUserId },
    });

    res.json({ message: 'Đã chuyển nhượng tài sản thành công' });
  } catch (error) {
    console.error('Error reassigning assets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /admin/orphaned-assets
 * Xóa vĩnh viễn tài liệu của người dùng bị xóa
 */
router.delete('/orphaned-assets', async (req, res) => {
  try {
    const { assetType, assetIds } = req.body;
    if (!assetType || !assetIds?.length) {
      return res.status(400).json({ error: 'assetType và assetIds là bắt buộc' });
    }
    await deleteOrphanedAssets(assetType, assetIds);

    await logAction({
      actor_id: req.user.id,
      action: 'DELETE_ASSETS',
      resource_type: assetType.toUpperCase(),
      company_id: req.user.company_id,
      changes: { assetIds },
    });

    res.json({ message: 'Đã xóa tài liệu thành công' });
  } catch (error) {
    console.error('Error deleting orphaned assets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/audit-logs
 * List audit logs with filters
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
