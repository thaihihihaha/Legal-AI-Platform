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

  const where = {};
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
      is_super_admin: true,
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
      is_super_admin: true,
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
export const resetUserPassword = async (userId) => {
  // Generate 12-character temp password
  const tempPassword = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: passwordHash, updated_at: new Date() },
  });

  return {
    userId,
    tempPassword, // Return once - user must change on login
  };
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

/**
 * Set user as super admin
 * @param {string} userId
 * @returns {Promise<User>}
 */
export const setAsSuperAdmin = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: { is_super_admin: true, role: 'admin', updated_at: new Date() },
    select: {
      id: true,
      email: true,
      is_super_admin: true,
      role: true,
    },
  });
};

/**
 * Create invitation token
 * @param {string} email
 * @param {string} role - owner|admin|member|viewer
 * @param {string} createdByUserId
 * @returns {Promise<InvitationToken>}
 */
export const createInvitation = async (email, role, createdByUserId) => {
  const validRoles = ['owner', 'admin', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error('Invalid role');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User với email này đã tồn tại');
  }

  // Generate unique token (64 chars)
  const token = crypto.randomBytes(32).toString('hex');

  // Invitation expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.invitationToken.create({
    data: {
      email,
      token,
      role,
      created_by: createdByUserId,
      expires_at: expiresAt,
    },
  });
};

/**
 * Get pending invitations (not used yet)
 * @returns {Promise<InvitationToken[]>}
 */
export const getPendingInvitations = async () => {
  const now = new Date();

  return prisma.invitationToken.findMany({
    where: {
      used_at: null,
      expires_at: { gt: now },
    },
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
      expires_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
};

/**
 * Cancel invitation
 * @param {string} invitationId
 * @returns {Promise<InvitationToken>}
 */
export const cancelInvitation = async (invitationId) => {
  return prisma.invitationToken.delete({
    where: { id: invitationId },
  });
};

/**
 * Verify invitation token (check if valid)
 * @param {string} token
 * @returns {Promise<InvitationToken|null>}
 */
export const verifyInvitationToken = async (token) => {
  const now = new Date();

  const invitation = await prisma.invitationToken.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      expires_at: true,
      used_at: true,
    },
  });

  if (!invitation) return null;
  if (invitation.used_at) return null; // Already used
  if (invitation.expires_at < now) return null; // Expired

  return invitation;
};

/**
 * Mark invitation as used
 * @param {string} token
 * @param {string} userId
 * @returns {Promise<InvitationToken>}
 */
export const markInvitationUsed = async (token, userId) => {
  return prisma.invitationToken.update({
    where: { token },
    data: {
      used_at: new Date(),
      used_by: userId,
    },
  });
};
