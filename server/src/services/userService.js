import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Get all users (super admin only)
 * @param {Object} filters - { search, role, is_active }
 * @returns {Promise<User[]>}
 */
export const getAllUsers = async (filters = {}) => {
  const { search, role, is_active } = filters;

  const where = { deleted_at: null };
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { full_name: { contains: search, mode: 'insensitive' } },
      { phone_number: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (is_active !== undefined) where.is_active = is_active === true || is_active === 'true';

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      full_name: true,
      phone_number: true,
      role: true,
      is_active: true,
      role: true,
      totp_enabled: true,
      created_at: true,
      last_login_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
};

/**
 * Get user by ID
 * @param {string} userId
 * @returns {Promise<User|null>}
 */
export const getUserById = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone_number: true,
      role: true,
      is_active: true,
      role: true,
      totp_enabled: true,
      company_id: true,
      created_at: true,
      updated_at: true,
    },
  });
};

/**
 * Update user details (name, email, phone, role)
 * @param {string} userId
 * @param {Object} updateData - { full_name, email, phone_number, role }
 * @returns {Promise<User>}
 */
export const updateUserDetails = async (userId, updateData) => {
  const allowedFields = ['full_name', 'phone_number', 'role'];
  const data = {};

  for (const field of allowedFields) {
    if (field in updateData) {
      data[field] = updateData[field];
    }
  }

  if ('email' in updateData) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: updateData.email } });
    if (existing && existing.id !== userId) {
      throw new Error('Email đã tồn tại');
    }
    data.email = updateData.email;
  }

  data.updated_at = new Date();

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      full_name: true,
      phone_number: true,
      role: true,
    },
  });
};

/**
 * Reset user password (generate temp password)
 * @param {string} userId
 * @returns {Promise<{userId: string, tempPassword: string}>}
 */
export const resetUserPassword = async (userId, customPassword = null) => {
  const password = customPassword || crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: passwordHash, updated_at: new Date() },
  });

  return { userId };
};

/**
 * Disable user account
 * @param {string} userId
 * @returns {Promise<User>}
 */
export const disableUser = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: { is_active: false, updated_at: new Date() },
    select: {
      id: true,
      email: true,
      is_active: true,
    },
  });
};

/**
 * Enable user account
 * @param {string} userId
 * @returns {Promise<User>}
 */
export const enableUser = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: { is_active: true, updated_at: new Date() },
    select: {
      id: true,
      email: true,
      is_active: true,
    },
  });
};

/**
 * Set user role
 * @param {string} userId
 * @param {string} newRole - owner|admin|member|viewer
 * @returns {Promise<User>}
 */
export const setUserRole = async (userId, newRole) => {
  const validRoles = ['owner', 'admin', 'member', 'viewer'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: newRole, updated_at: new Date() },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
};

/**
 * Disable 2FA for user (admin command)
 * @param {string} userId
 * @returns {Promise<User>}
 */
export const disable2FA = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      totp_enabled: false,
      totp_secret: null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      totp_enabled: true,
    },
  });
};


export const createUserByAdmin = async (companyId, userData) => {
  const { email, password, full_name, role, phone_number } = userData;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email đã tồn tại (Tài khoản đã được đăng ký hoặc bị xóa mềm).');
  }

  const passwordHash = await bcrypt.hash(password || 'Abc@12345', 10);

  return prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      full_name,
      role: role || 'member',
      phone_number,
      company_id: companyId,
      is_active: true
    },
  });
};

export const hardDeleteUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Người dùng không tồn tại');

  return prisma.$transaction(async (tx) => {
    // Gỡ tài liệu & hợp đồng ra khỏi user (chuyển thành orphaned)
    // Contract và Document đã có onDelete: SetNull nhưng ta NULL thủ công để chắc chắn
    await tx.document.updateMany({ where: { uploaded_by: userId }, data: { uploaded_by: null } });
    await tx.contract.updateMany({ where: { uploaded_by: userId }, data: { uploaded_by: null } });
    // Draft có user_id NOT NULL nên xóa hẳn khi xóa user
    await tx.draftGenerated.deleteMany({ where: { user_id: userId } });
    // Hard delete user — cascade sẽ xử lý: refresh_tokens, audit_logs, ...
    return tx.user.delete({ where: { id: userId } });
  });
};


export const getOrphanedAssets = async () => {
  // Tài liệu không còn chủ sở hữu (uploaded_by = NULL sau khi user bị xóa)
  const [documents, contracts] = await Promise.all([
    prisma.document.findMany({
      where: { uploaded_by: null },
      select: { id: true, name: true, created_at: true, uploaded_by: true, status: true },
      orderBy: { created_at: 'desc' },
    }),
    prisma.contract.findMany({
      where: { uploaded_by: null },
      select: { id: true, name: true, created_at: true, uploaded_by: true, status: true },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { documents, contracts, drafts: [] };
};

export const reassignAssets = async (assetType, assetIds, newUserId) => {
  const newOwner = await prisma.user.findUnique({ where: { id: newUserId } });
  if (!newOwner) throw new Error('Người dùng nhận không tồn tại');

  if (assetType === 'document') {
    return prisma.document.updateMany({ where: { id: { in: assetIds } }, data: { uploaded_by: newUserId } });
  } else if (assetType === 'contract') {
    return prisma.contract.updateMany({ where: { id: { in: assetIds } }, data: { uploaded_by: newUserId } });
  }
  throw new Error('Loại tài sản không hợp lệ (chỉ hỗ trợ document và contract)');
};

export const deleteOrphanedAssets = async (assetType, assetIds) => {
  if (assetType === 'document') {
    return prisma.document.deleteMany({ where: { id: { in: assetIds } } });
  } else if (assetType === 'contract') {
    return prisma.contract.deleteMany({ where: { id: { in: assetIds } } });
  }
  throw new Error('Loại tài sản không hợp lệ (chỉ hỗ trợ document và contract)');
};
