/**
 * PHASE 3.2: Multi-User Collaboration System
 * Permission management, activity tracking, and sharing features
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Grant access to a draft for another user
 */
export const grantDraftAccess = async ({
  draftId,
  userId,
  role = 'viewer', // owner, editor, reviewer, viewer
  grantedBy,
  expiresAt = null,
}) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    // Store access control in draft metadata
    const metadata = draft.validation_result || {};
    if (!metadata.access_grants) {
      metadata.access_grants = [];
    }

    const access = {
      id: randomUUID(),
      user_id: userId,
      role,
      granted_by: grantedBy,
      granted_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    metadata.access_grants.push(access);

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    // Create activity log
    await logActivity(draftId, grantedBy, 'shared', 'permission_change', {
      granted_to: userId,
      role,
    });

    return access;
  } catch (error) {
    console.error('Error granting draft access:', error);
    throw error;
  }
};

/**
 * Revoke draft access
 */
export const revokeDraftAccess = async (draftId, userId, revokedBy) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.access_grants) {
      const index = metadata.access_grants.findIndex(a => a.user_id === userId);
      if (index !== -1) {
        metadata.access_grants[index].revoked_by = revokedBy;
        metadata.access_grants[index].revoked_at = new Date().toISOString();
      }
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    await logActivity(draftId, revokedBy, 'shared', 'permission_change', {
      revoked_from: userId,
    });

    return metadata.access_grants;
  } catch (error) {
    console.error('Error revoking draft access:', error);
    throw error;
  }
};

/**
 * Check if a user has access to a draft
 */
export const checkDraftAccess = async (draftId, userId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { user_id: true, company_id: true, validation_result: true },
    });

    if (!draft) {
      return { hasAccess: false, role: null };
    }

    // Owner has full access
    if (draft.user_id === userId) {
      return { hasAccess: true, role: 'owner' };
    }

    // Check access grants
    const metadata = draft.validation_result || {};
    const accessGrant = metadata.access_grants?.find(
      a => a.user_id === userId && !a.revoked_at
    );

    if (accessGrant) {
      // Check if access has expired
      if (accessGrant.expires_at && new Date(accessGrant.expires_at) < new Date()) {
        return { hasAccess: false, role: null };
      }
      return { hasAccess: true, role: accessGrant.role };
    }

    // Check if user is in same company (basic access)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    if (user && user.company_id === draft.company_id) {
      return { hasAccess: true, role: 'viewer' };
    }

    return { hasAccess: false, role: null };
  } catch (error) {
    console.error('Error checking draft access:', error);
    throw error;
  }
};

/**
 * Log activity on a draft
 */
export const logActivity = async (
  draftId,
  userId,
  action, // created, updated, deleted, shared, commented, approved
  actionType = 'other', // content_change, status_change, permission_change, review_action
  details = {}
) => {
  try {
    const activity = {
      id: randomUUID(),
      draft_id: draftId,
      user_id: userId,
      action,
      action_type: actionType,
      details,
      created_at: new Date().toISOString(),
    };

    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.activity_logs) {
      metadata.activity_logs = [];
    }

    metadata.activity_logs.push(activity);
    // Keep only last 100 activities
    if (metadata.activity_logs.length > 100) {
      metadata.activity_logs = metadata.activity_logs.slice(-100);
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

/**
 * Get activity log for a draft
 */
export const getActivityLog = async (draftId, limit = 50) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const activities = draft.validation_result?.activity_logs || [];
    return activities.slice(-limit).reverse();
  } catch (error) {
    console.error('Error getting activity log:', error);
    throw error;
  }
};

/**
 * Get list of collaborators on a draft
 */
export const getDraftCollaborators = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { user_id: true, validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const collaborators = [];

    // Add owner
    const owner = await prisma.user.findUnique({
      where: { id: draft.user_id },
      select: { id: true, full_name: true, email: true },
    });

    if (owner) {
      collaborators.push({
        ...owner,
        role: 'owner',
      });
    }

    // Add users with access grants
    const metadata = draft.validation_result || {};
    const accessGrants = metadata.access_grants || [];

    for (const grant of accessGrants) {
      if (grant.revoked_at) continue; // Skip revoked access

      const user = await prisma.user.findUnique({
        where: { id: grant.user_id },
        select: { id: true, full_name: true, email: true },
      });

      if (user) {
        collaborators.push({
          ...user,
          role: grant.role,
          granted_at: grant.granted_at,
          expires_at: grant.expires_at,
        });
      }
    }

    return collaborators;
  } catch (error) {
    console.error('Error getting draft collaborators:', error);
    throw error;
  }
};

/**
 * Create a notification for a user
 */
export const createNotification = async ({
  userId,
  title,
  message,
  notificationType = 'draft_commented',
  relatedDraftId = null,
  actionUrl = null,
}) => {
  try {
    const notification = {
      id: randomUUID(),
      user_id: userId,
      title,
      message,
      notification_type: notificationType,
      related_draft_id: relatedDraftId,
      action_url: actionUrl,
      is_read: false,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    // Store in user preferences or a simple notifications list
    // For now, we can create an audit log or store in a json array

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get user's recent activity across drafts
 */
export const getUserActivity = async (userId, companyId, limit = 100) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { id: true, title: true, validation_result: true },
      take: 50,
    });

    const allActivities = [];

    for (const draft of drafts) {
      const activities = draft.validation_result?.activity_logs || [];
      const userActivities = activities.filter(a => a.user_id === userId);

      allActivities.push(...userActivities.map(a => ({
        ...a,
        draft_id: draft.id,
        draft_title: draft.title,
      })));
    }

    return allActivities.slice(-limit).reverse();
  } catch (error) {
    console.error('Error getting user activity:', error);
    throw error;
  }
};

/**
 * Get all drafts shared with a user
 */
export const getSharedDrafts = async (userId, companyId) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: {
        company_id: companyId,
        // Can't directly query JSON in Prisma, so get all and filter
      },
      select: { id: true, title: true, user_id: true, status: true, created_at: true, validation_result: true },
    });

    const sharedDrafts = [];

    for (const draft of drafts) {
      if (draft.user_id === userId) {
        continue; // Skip owned drafts
      }

      const access = await checkDraftAccess(draft.id, userId);
      if (access.hasAccess) {
        sharedDrafts.push({
          ...draft,
          role: access.role,
        });
      }
    }

    return sharedDrafts;
  } catch (error) {
    console.error('Error getting shared drafts:', error);
    throw error;
  }
};

/**
 * Remove expired access grants
 */
export const cleanupExpiredAccess = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.access_grants) {
      metadata.access_grants = metadata.access_grants.filter(grant => {
        if (!grant.expires_at) return true;
        return new Date(grant.expires_at) > new Date();
      });
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return metadata.access_grants;
  } catch (error) {
    console.error('Error cleaning up expired access:', error);
    throw error;
  }
};
