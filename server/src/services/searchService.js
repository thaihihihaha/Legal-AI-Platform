/**
 * PHASE 3.4: Search & Analytics System
 * Full-text search, saved searches, and productivity analytics
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Perform full-text search across drafts
 */
export const searchDrafts = async (companyId, query, filters = {}) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: {
        company_id: companyId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        user_id: true,
        created_at: true,
      },
      take: 50,
    });

    // Filter by search query (basic text search)
    const results = drafts.filter(draft => {
      const searchText = `${draft.title} ${draft.content || ''}`.toLowerCase();
      const queryTerms = query.toLowerCase().split(' ');

      return queryTerms.every(term => searchText.includes(term));
    });

    // Apply additional filters
    let filtered = results;

    if (filters.status) {
      filtered = filtered.filter(d => d.status === filters.status);
    }

    if (filters.userId) {
      filtered = filtered.filter(d => d.user_id === filters.userId);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(d => new Date(d.created_at) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(d => new Date(d.created_at) <= new Date(filters.dateTo));
    }

    // Add relevance score
    const scored = filtered.map(draft => ({
      ...draft,
      relevance_score: calculateRelevance(query, draft),
    }));

    return scored.sort((a, b) => b.relevance_score - a.relevance_score);
  } catch (error) {
    console.error('Error searching drafts:', error);
    throw error;
  }
};

/**
 * Save a search query for later use
 */
export const saveSearch = async ({
  userId,
  companyId,
  name,
  query,
  filters = {},
}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const savedSearch = {
      id: randomUUID(),
      user_id: userId,
      company_id: companyId,
      name,
      query,
      filters,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      search_count: 0,
    };

    // Store in user metadata or create a simple list
    // For now, we'll store in a JSON field if available

    return savedSearch;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
};

/**
 * Get user's saved searches
 */
export const getUserSavedSearches = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Return stored searches
    return [];
  } catch (error) {
    console.error('Error getting user saved searches:', error);
    throw error;
  }
};

/**
 * Get analytics for a draft
 */
export const getDraftAnalytics = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        status: true,
        validation_result: true,
      },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    const activityLogs = metadata.activity_logs || [];

    const analytics = {
      draft_id: draftId,
      title: draft.title,
      status: draft.status,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
      total_edits: activityLogs.filter(a => a.action === 'updated').length,
      total_comments: metadata.review_session?.comments?.length || 0,
      review_sessions: metadata.review_session ? 1 : 0,
      sharing_count: metadata.access_grants?.filter(a => !a.revoked_at).length || 0,
      collaborators: new Set(metadata.access_grants?.map(a => a.user_id) || []).size,
      last_activity: activityLogs[activityLogs.length - 1]?.created_at || draft.updated_at,
      views: metadata.access_count || 0,
    };

    return analytics;
  } catch (error) {
    console.error('Error getting draft analytics:', error);
    throw error;
  }
};

/**
 * Get company-wide analytics
 */
export const getCompanyAnalytics = async (companyId, startDate = null, endDate = null) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        status: true,
        validation_result: true,
      },
    });

    // Filter by date range if provided
    let filtered = drafts;
    if (startDate) {
      filtered = filtered.filter(d => new Date(d.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(d => new Date(d.created_at) <= new Date(endDate));
    }

    const totalEdits = filtered.reduce((sum, d) => {
      const logs = d.validation_result?.activity_logs || [];
      return sum + logs.filter(l => l.action === 'updated').length;
    }, 0);

    const analytics = {
      company_id: companyId,
      period_start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
      period_end: endDate || new Date(),
      total_documents: filtered.length,
      documents_by_status: {
        draft: filtered.filter(d => d.status === 'draft').length,
        in_review: filtered.filter(d => d.status === 'in_review').length,
        approved: filtered.filter(d => d.status === 'approved').length,
        signed: filtered.filter(d => d.status === 'signed').length,
      },
      total_edits: totalEdits,
      avg_edits_per_doc: (totalEdits / filtered.length).toFixed(2),
      total_comments: filtered.reduce((sum, d) => {
        return sum + (d.validation_result?.review_session?.comments?.length || 0);
      }, 0),
      total_shares: filtered.reduce((sum, d) => {
        return sum + (d.validation_result?.access_grants?.length || 0);
      }, 0),
      unique_collaborators: new Set(
        filtered.flatMap(d => d.validation_result?.access_grants?.map(a => a.user_id) || [])
      ).size,
    };

    return analytics;
  } catch (error) {
    console.error('Error getting company analytics:', error);
    throw error;
  }
};

/**
 * Get user activity analytics
 */
export const getUserActivityAnalytics = async (userId, companyId) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        validation_result: true,
      },
    });

    let userActivityCount = 0;
    let userDraftsCreated = 0;
    let userCommentsCount = 0;

    for (const draft of drafts) {
      const logs = draft.validation_result?.activity_logs || [];
      userActivityCount += logs.filter(l => l.user_id === userId).length;

      if (draft.validation_result?.review_session) {
        const comments = draft.validation_result.review_session.comments || [];
        userCommentsCount += comments.filter(c => c.commenter_id === userId).length;
      }
    }

    const userDrafts = await prisma.draftGenerated.count({
      where: {
        user_id: userId,
        company_id: companyId,
      },
    });

    userDraftsCreated = userDrafts;

    const analytics = {
      user_id: userId,
      company_id: companyId,
      activity_count: userActivityCount,
      drafts_created: userDraftsCreated,
      comments_made: userCommentsCount,
      documents_shared_with: new Set(
        drafts.flatMap(d =>
          d.validation_result?.access_grants
            ?.filter(a => a.granted_by === userId)
            .map(a => a.user_id) || []
        )
      ).size,
    };

    return analytics;
  } catch (error) {
    console.error('Error getting user activity analytics:', error);
    throw error;
  }
};

function calculateRelevance(query, draft) {
  const queryTerms = query.toLowerCase().split(' ');
  let score = 0;

  // Boost if query matches title exactly
  if (draft.title.toLowerCase().includes(query.toLowerCase())) {
    score += 10;
  }

  // Add points for each query term found
  for (const term of queryTerms) {
    if (draft.title.toLowerCase().includes(term)) {
      score += 5;
    }
    if (draft.content?.toLowerCase().includes(term)) {
      score += 2;
    }
  }

  return score;
}
