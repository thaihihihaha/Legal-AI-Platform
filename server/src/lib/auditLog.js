import { prisma } from './prisma.js';

/**
 * Log an action to AuditLog table
 * @param {Object} params
 * @param {string} params.actor_id - User ID performing action
 * @param {string} params.action - CREATE, UPDATE, DELETE, DISABLE, ENABLE, RESET_PASSWORD, etc.
 * @param {string} params.resource_type - USER, INVITATION, SETTING, DOCUMENT, CONTRACT, etc.
 * @param {string} params.resource_id - ID of affected resource
 * @param {string} params.company_id - Company context
 * @param {Object} params.changes - What changed { before, after, fields_changed }
 * @param {string} params.ip_address - Optional IP for security
 * @returns {Promise<AuditLog>}
 */
export const logAction = async ({
  actor_id,
  action,
  resource_type,
  resource_id,
  company_id,
  changes = {},
  ip_address = null,
}) => {
  return prisma.auditLog.create({
    data: {
      actor_id,
      action,
      resource_type,
      resource_id,
      company_id,
      changes,
      ip_address,
      created_at: new Date(),
    },
  });
};

/**
 * Get audit logs with filters
 * @param {Object} filters
 * @param {string} filters.actor_id - Filter by who performed action
 * @param {string} filters.resource_type - Filter by resource type
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.company_id - Filter by company
 * @param {number} filters.limit - Max results (default 100)
 * @param {number} filters.offset - Pagination offset
 * @returns {Promise<AuditLog[]>}
 */
export const getAuditLogs = async (filters = {}) => {
  const { actor_id, resource_type, action, company_id, limit = 100, offset = 0 } = filters;

  const where = {};
  if (actor_id) where.actor_id = actor_id;
  if (resource_type) where.resource_type = resource_type;
  if (action) where.action = action;
  if (company_id) where.company_id = company_id;

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(limit, 500), // Max 500 per request
    skip: offset,
  });
};

/**
 * Export audit logs for compliance (CSV format)
 * @param {Object} filters - Same as getAuditLogs
 * @returns {Promise<string>} - CSV content
 */
export const exportAuditLogs = async (filters = {}) => {
  const logs = await getAuditLogs({ ...filters, limit: 10000 });

  const headers = ['Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource ID', 'Changes', 'IP Address'];
  const rows = logs.map((log) => [
    log.created_at.toISOString(),
    log.actor?.email || 'System',
    log.action,
    log.resource_type,
    log.resource_id,
    log.changes ? log.changes.replace(/"/g, '""') : '', // Escape quotes for CSV
    log.ip_address || '',
  ]);

  // Build CSV
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

  return csv;
};

/**
 * Clear old audit logs (retention policy - keep 90 days)
 * @param {number} days - Default 90
 * @returns {Promise<number>} - Count of deleted logs
 */
export const clearOldAuditLogs = async (days = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.auditLog.deleteMany({
    where: {
      created_at: { lt: cutoffDate },
    },
  });

  return result.count;
};
