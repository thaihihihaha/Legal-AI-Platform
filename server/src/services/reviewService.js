/**
 * PHASE 3.1: AI-Powered Contract Review System
 * Comprehensive review management service with risk assessment and approval workflows
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Create a new review session for a draft
 */
export const createReviewSession = async ({
  draftId,
  initiatedBy,
  reviewType = 'standard',
  dueDate = null,
  notes = '',
}) => {
  try {
    // Create review session stored in a JSON structure
    const session = {
      id: randomUUID(),
      draft_id: draftId,
      initiated_by: initiatedBy,
      status: 'pending',
      review_type: reviewType,
      start_date: new Date().toISOString(),
      due_date: dueDate,
      notes,
      assignments: [],
      comments: [],
      risk_assessment: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in draft's metadata
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    metadata.review_session = session;

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        review_status: 'under_review',
        review_started_at: new Date(),
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating review session:', error);
    throw error;
  }
};

/**
 * Add a review comment/annotation
 */
export const addReviewComment = async ({
  sessionId,
  draftId,
  commenterId,
  content,
  clauseReference = null,
  commentType = 'comment',
  severity = 'info',
}) => {
  try {
    const comment = {
      id: randomUUID(),
      session_id: sessionId,
      commenter_id: commenterId,
      content,
      clause_reference: clauseReference,
      comment_type: commentType,
      severity,
      resolved: false,
      replies: [],
      created_at: new Date().toISOString(),
    };

    // Store in draft metadata
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.review_session) {
      metadata.review_session = { comments: [] };
    }
    if (!metadata.review_session.comments) {
      metadata.review_session.comments = [];
    }

    metadata.review_session.comments.push(comment);

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return comment;
  } catch (error) {
    console.error('Error adding review comment:', error);
    throw error;
  }
};

/**
 * AI-powered risk assessment of a draft
 */
export const performRiskAssessment = async (draftId, assessedBy = null) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { id: true, title: true, content: true, research_data: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    // Call AI agent to perform risk assessment
    const { agentAsk } = await import('./legal_agent.js');

    const riskPrompt = `Analyze the following contract for legal and compliance risks. 
    
Title: ${draft.title}

Content: ${draft.content?.substring(0, 2000)}...

Provide a comprehensive risk assessment including:
1. Overall risk level (critical, high, medium, low)
2. Legal risks (array of specific risks)
3. Compliance risks (jurisdiction-specific)
4. Operational risks
5. Financial risks
6. Recommendations for mitigation

Return as JSON.`;

    const riskAssessmentData = await agentAsk(riskPrompt);

    const assessment = {
      id: randomUUID(),
      draft_id: draftId,
      assessed_by: assessedBy,
      overall_risk_level: riskAssessmentData.overall_risk_level || 'medium',
      compliance_score: riskAssessmentData.compliance_score || 50,
      legal_risks: riskAssessmentData.legal_risks || [],
      compliance_risks: riskAssessmentData.compliance_risks || [],
      operational_risks: riskAssessmentData.operational_risks || [],
      financial_risks: riskAssessmentData.financial_risks || [],
      recommendations: riskAssessmentData.recommendations || [],
      status: 'completed',
      created_at: new Date().toISOString(),
    };

    // Store assessment
    const metadata = (await prisma.draftGenerated.findUnique({ where: { id: draftId } })).validation_result ||
      {};
    if (!metadata.review_session) {
      metadata.review_session = {};
    }
    metadata.review_session.risk_assessment = assessment;

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        overall_compliance_score: assessment.compliance_score,
      },
    });

    return assessment;
  } catch (error) {
    console.error('Error performing risk assessment:', error);
    throw error;
  }
};

/**
 * Assign reviewers to a session
 */
export const assignReviewers = async (sessionId, draftId, reviewers) => {
  try {
    // reviewers = [{userId, role, approverOrder}]
    const assignments = reviewers.map(({userId, role = 'reviewer', approverOrder = null}) => ({
      id: randomUUID(),
      reviewer_id: userId,
      role,
      status: 'pending',
      approver_order: approverOrder,
      assigned_at: new Date().toISOString(),
    }));

    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.review_session) {
      metadata.review_session = { assignments: [] };
    }

    metadata.review_session.assignments = assignments;

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return assignments;
  } catch (error) {
    console.error('Error assigning reviewers:', error);
    throw error;
  }
};

/**
 * Approve a draft review
 */
export const approveReview = async (sessionId, draftId, approverId, notes = '') => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.review_session) {
      metadata.review_session.status = 'completed';
      metadata.review_session.approved_by = approverId;
      metadata.review_session.approval_notes = notes;
      metadata.review_session.end_date = new Date().toISOString();
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        status: 'approved',
        review_status: 'approved',
        review_completed_at: new Date(),
      },
    });

    return metadata.review_session;
  } catch (error) {
    console.error('Error approving review:', error);
    throw error;
  }
};

/**
 * Reject a draft with feedback
 */
export const rejectReview = async (sessionId, draftId, rejectedBy, reasons = []) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.review_session) {
      metadata.review_session.status = 'completed';
      metadata.review_session.rejected_by = rejectedBy;
      metadata.review_session.rejection_reasons = reasons;
      metadata.review_session.end_date = new Date().toISOString();
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        status: 'draft',
        review_status: 'rejected',
      },
    });

    return metadata.review_session;
  } catch (error) {
    console.error('Error rejecting review:', error);
    throw error;
  }
};

/**
 * Get review session details
 */
export const getReviewSession = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    return draft.validation_result?.review_session || null;
  } catch (error) {
    console.error('Error getting review session:', error);
    throw error;
  }
};

/**
 * Resolve a comment as fixed
 */
export const resolveComment = async (draftId, commentId, resolvedBy, resolutionNotes = '') => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.review_session && metadata.review_session.comments) {
      const comment = metadata.review_session.comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        comment.resolved_by = resolvedBy;
        comment.resolved_at = new Date().toISOString();
        comment.resolution_notes = resolutionNotes;
      }
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return metadata.review_session?.comments?.find(c => c.id === commentId);
  } catch (error) {
    console.error('Error resolving comment:', error);
    throw error;
  }
};

/**
 * Get review statistics
 */
export const getReviewStatistics = async (companyId) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { review_status: true, created_at: true, review_started_at: true, review_completed_at: true },
    });

    const stats = {
      total_drafts: drafts.length,
      under_review: drafts.filter(d => d.review_status === 'under_review').length,
      approved: drafts.filter(d => d.review_status === 'approved').length,
      rejected: drafts.filter(d => d.review_status === 'rejected').length,
      not_reviewed: drafts.filter(d => d.review_status === 'not_reviewed').length,
      avg_review_time_days: calculateAverageReviewTime(drafts),
    };

    return stats;
  } catch (error) {
    console.error('Error getting review statistics:', error);
    throw error;
  }
};

function calculateAverageReviewTime(drafts) {
  const reviewedDrafts = drafts.filter(d => d.review_started_at && d.review_completed_at);
  if (reviewedDrafts.length === 0) return 0;

  const totalTime = reviewedDrafts.reduce((sum, d) => {
    const start = new Date(d.review_started_at);
    const end = new Date(d.review_completed_at);
    return sum + (end - start) / (1000 * 60 * 60 * 24);
  }, 0);

  return (totalTime / reviewedDrafts.length).toFixed(2);
}
