/**
 * PHASE 3 Routes: Review, Collaboration, and Compliance
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as reviewService from '../services/reviewService.js';
import * as collaborationService from '../services/collaborationService.js';
import * as complianceService from '../services/complianceService.js';

const router = express.Router();

// ========== PHASE 3.1: Review Routes ==========

/**
 * POST /v1/reviews - Create a new review session
 */
router.post('/reviews', requireAuth, async (req, res) => {
  try {
    const { draftId, reviewType = 'standard', dueDate = null, notes = '' } = req.body;
    const userId = req.user.id;

    if (!draftId) {
      return res.status(400).json({
        success: false,
        error: 'draftId is required',
      });
    }

    const session = await reviewService.createReviewSession({
      draftId,
      initiatedBy: userId,
      reviewType,
      dueDate,
      notes,
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('POST /reviews error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/reviews/:draftId - Get review session details
 */
router.get('/reviews/:draftId', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;

    const session = await reviewService.getReviewSession(draftId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Review session not found',
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('GET /reviews/:draftId error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/reviews/:draftId/comments - Add a review comment
 */
router.post('/reviews/:draftId/comments', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { sessionId, content, clauseReference, commentType = 'comment', severity = 'info' } = req.body;
    const userId = req.user.id;

    if (!sessionId || !content) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and content are required',
      });
    }

    const comment = await reviewService.addReviewComment({
      sessionId,
      draftId,
      commenterId: userId,
      content,
      clauseReference,
      commentType,
      severity,
    });

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error('POST /reviews/:draftId/comments error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/drafts/:draftId/risk-assessment - Perform risk assessment
 */
router.post('/drafts/:draftId/risk-assessment', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;

    const assessment = await reviewService.performRiskAssessment(draftId, userId);

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error('POST /drafts/:draftId/risk-assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/reviews/:draftId/approve - Approve a draft review
 */
router.post('/reviews/:draftId/approve', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { sessionId, notes = '' } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    const session = await reviewService.approveReview(sessionId, draftId, userId, notes);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('POST /reviews/:draftId/approve error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/reviews/:draftId/reject - Reject a draft review
 */
router.post('/reviews/:draftId/reject', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { sessionId, reasons = [] } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    const session = await reviewService.rejectReview(sessionId, draftId, userId, reasons);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('POST /reviews/:draftId/reject error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/reviews/stats/:companyId - Get review statistics
 */
router.get('/reviews/stats/:companyId', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const stats = await reviewService.getReviewStatistics(companyId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('GET /reviews/stats/:companyId error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== PHASE 3.2: Collaboration Routes ==========

/**
 * POST /v1/drafts/:draftId/share - Share a draft with another user
 */
router.post('/drafts/:draftId/share', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { userId, role = 'viewer', expiresAt = null } = req.body;
    const sharingUserId = req.user.id;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        error: 'userId and role are required',
      });
    }

    const access = await collaborationService.grantDraftAccess({
      draftId,
      userId,
      role,
      grantedBy: sharingUserId,
      expiresAt,
    });

    res.json({
      success: true,
      data: access,
    });
  } catch (error) {
    console.error('POST /drafts/:draftId/share error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/drafts/:draftId/revoke-access - Revoke draft access
 */
router.post('/drafts/:draftId/revoke-access', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { userId } = req.body;
    const revokedBy = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const accessGrants = await collaborationService.revokeDraftAccess(draftId, userId, revokedBy);

    res.json({
      success: true,
      data: accessGrants,
    });
  } catch (error) {
    console.error('POST /drafts/:draftId/revoke-access error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/drafts/:draftId/collaborators - Get draft collaborators
 */
router.get('/drafts/:draftId/collaborators', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;

    const collaborators = await collaborationService.getDraftCollaborators(draftId);

    res.json({
      success: true,
      data: collaborators,
    });
  } catch (error) {
    console.error('GET /drafts/:draftId/collaborators error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/drafts/:draftId/activity - Get activity log
 */
router.get('/drafts/:draftId/activity', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { limit = 50 } = req.query;

    const activity = await collaborationService.getActivityLog(draftId, parseInt(limit));

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('GET /drafts/:draftId/activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/shared-drafts - Get drafts shared with user
 */
router.get('/shared-drafts', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const sharedDrafts = await collaborationService.getSharedDrafts(userId, companyId);

    res.json({
      success: true,
      data: sharedDrafts,
    });
  } catch (error) {
    console.error('GET /shared-drafts error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== PHASE 3.3: Compliance & Audit Routes ==========

/**
 * GET /v1/drafts/:draftId/audit-trail - Get audit trail
 */
router.get('/drafts/:draftId/audit-trail', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { limit = 100 } = req.query;

    const trail = await complianceService.getAuditTrail(draftId, parseInt(limit));

    res.json({
      success: true,
      data: trail,
    });
  } catch (error) {
    console.error('GET /drafts/:draftId/audit-trail error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/drafts/:draftId/sign - Record digital signature
 */
router.post('/drafts/:draftId/sign', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { signatureData, signatureMethod = 'timestamp' } = req.body;
    const userId = req.user.id;

    if (!signatureData) {
      return res.status(400).json({
        success: false,
        error: 'signatureData is required',
      });
    }

    const signature = await complianceService.recordDigitalSignature({
      draftId,
      signedBy: userId,
      signatureData,
      signatureMethod,
    });

    res.json({
      success: true,
      data: signature,
    });
  } catch (error) {
    console.error('POST /drafts/:draftId/sign error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/drafts/:draftId/legal-hold - Apply legal hold
 */
router.post('/drafts/:draftId/legal-hold', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { reason, expiryDate = null, caseNumber = null } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason is required',
      });
    }

    const hold = await complianceService.applyLegalHold({
      draftId,
      reason,
      createdBy: userId,
      expiryDate,
      caseNumber,
    });

    res.json({
      success: true,
      data: hold,
    });
  } catch (error) {
    console.error('POST /drafts/:draftId/legal-hold error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/drafts/:draftId/legal-holds - Get legal holds
 */
router.get('/drafts/:draftId/legal-holds', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;

    const holds = await complianceService.getLegalHolds(draftId);

    res.json({
      success: true,
      data: holds,
    });
  } catch (error) {
    console.error('GET /drafts/:draftId/legal-holds error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /v1/drafts/:draftId/compliance-check - Check compliance
 */
router.post('/drafts/:draftId/compliance-check', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { standardName, jurisdiction = null } = req.body;
    const userId = req.user.id;

    if (!standardName) {
      return res.status(400).json({
        success: false,
        error: 'standardName is required',
      });
    }

    const check = await complianceService.checkCompliance({
      draftId,
      standardName,
      jurisdiction,
      checkedBy: userId,
    });

    res.json({
      success: true,
      data: check,
    });
  } catch (error) {
    console.error('POST /drafts/:draftId/compliance-check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/drafts/:draftId/compliance - Get compliance checks
 */
router.get('/drafts/:draftId/compliance', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;

    const checks = await complianceService.getComplianceChecks(draftId);

    res.json({
      success: true,
      data: checks,
    });
  } catch (error) {
    console.error('GET /drafts/:draftId/compliance error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /v1/compliance-report/:companyId - Get compliance report
 */
router.get('/compliance-report/:companyId', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const report = await complianceService.getComplianceReport(companyId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('GET /compliance-report/:companyId error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
