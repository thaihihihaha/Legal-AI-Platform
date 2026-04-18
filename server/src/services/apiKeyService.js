import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const KEY_PREFIX_SIZE = 8;
const KEY_SECRET_SIZE = 24;

const hashApiKey = (value) => crypto.createHash('sha256').update(value).digest('hex');

const generateApiKey = () => {
  const prefix = crypto.randomBytes(KEY_PREFIX_SIZE).toString('hex');
  const secret = crypto.randomBytes(KEY_SECRET_SIZE).toString('hex');
  return {
    prefix,
    plainKey: `lga_${prefix}_${secret}`,
  };
};

export const listApiKeysByCompany = async (companyId) => {
  return prisma.apiKey.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      key_prefix: true,
      permissions: true,
      rate_limit: true,
      is_active: true,
      last_used_at: true,
      expires_at: true,
      created_at: true,
    },
  });
};

export const createApiKeyForCompany = async ({
  companyId,
  name,
  permissions = ['read', 'ask', 'review'],
  rateLimit = 60,
  expiresAt = null,
}) => {
  const { prefix, plainKey } = generateApiKey();
  const keyHash = hashApiKey(plainKey);

  const record = await prisma.apiKey.create({
    data: {
      company_id: companyId,
      name,
      key_hash: keyHash,
      key_prefix: prefix,
      permissions,
      rate_limit: rateLimit,
      expires_at: expiresAt,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      key_prefix: true,
      permissions: true,
      rate_limit: true,
      is_active: true,
      expires_at: true,
      created_at: true,
    },
  });

  return {
    ...record,
    plain_key: plainKey,
  };
};

export const updateApiKey = async ({ companyId, keyId, patch }) => {
  return prisma.apiKey.updateMany({
    where: {
      id: keyId,
      company_id: companyId,
    },
    data: {
      ...(patch.name ? { name: patch.name } : {}),
      ...(Array.isArray(patch.permissions) ? { permissions: patch.permissions } : {}),
      ...(typeof patch.rate_limit === 'number' ? { rate_limit: patch.rate_limit } : {}),
      ...(typeof patch.is_active === 'boolean' ? { is_active: patch.is_active } : {}),
      ...(patch.expires_at !== undefined ? { expires_at: patch.expires_at } : {}),
    },
  });
};

export const revokeApiKey = async ({ companyId, keyId }) => {
  return prisma.apiKey.updateMany({
    where: {
      id: keyId,
      company_id: companyId,
    },
    data: {
      is_active: false,
    },
  });
};

export const validatePlainApiKey = async (plainApiKey) => {
  if (!plainApiKey || typeof plainApiKey !== 'string') {
    return null;
  }

  const normalized = plainApiKey.trim();
  const parts = normalized.split('_');
  if (parts.length < 3 || parts[0] !== 'lga') {
    return null;
  }

  const prefix = parts[1];
  const keyHash = hashApiKey(normalized);

  const record = await prisma.apiKey.findFirst({
    where: {
      key_prefix: prefix,
      key_hash: keyHash,
      is_active: true,
    },
    select: {
      id: true,
      company_id: true,
      name: true,
      permissions: true,
      rate_limit: true,
      expires_at: true,
      is_active: true,
      created_at: true,
      last_used_at: true,
    },
  });

  if (!record) {
    return null;
  }

  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return null;
  }

  return record;
};

export const touchApiKeyUsage = async (keyId) => {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { last_used_at: new Date() },
  });
};
