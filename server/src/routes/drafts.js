import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createDraftFromTemplate,
  getDraftsByUser,
  getDraftDetail,
  saveDraft,
  validateDraft,
  updateDraftStatus,
  deleteDraft,
  getDraftVersions,
  exportDraft,
} from '../services/draftService.js';

const router = express.Router();

// Middleware: Yêu cầu authentication
router.use(requireAuth);

/**
 * POST /v1/drafts
 * Tạo draft mới từ template
 * 
 * Body: {
 *   templateId: string,      // 'labor_contract' | 'service_contract' | 'notification'
 *   variables: {             // Form data từ user
 *     company_name: string,
 *     employee_name: string,
 *     ...
 *   },
 *   withResearch?: boolean   // Optional: fetch latest legal templates
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { templateId, variables, withResearch = true } = req.body;
    const userId = req.user.id;  // Changed from user_id
    const companyId = req.user.companyId;  // Changed from company_id

    if (!templateId || !variables) {
      return res.status(400).json({
        success: false,
        error: 'templateId và variables bắt buộc',
      });
    }

    const draft = await createDraftFromTemplate(
      userId,
      companyId,
      templateId,
      variables,
      { withResearch }
    );

    // Ensure draft is properly serialized
    if (!draft) {
      throw new Error('Draft creation returned null');
    }

    // Return draft with proper JSON structure
    return res.status(201).json({
      success: true,
      data: {
        id: draft.id,
        template_id: draft.template_id,
        title: draft.title,
        content: draft.content,
        status: draft.status,
        version: draft.version,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
      },
    });
  } catch (error) {
    console.error('POST /v1/drafts error:', error);
    // Ensure error response is valid JSON
    const errorMessage = error?.message || 'Lỗi không xác định';
    const is400Error = errorMessage && (
      errorMessage.includes('không tìm thấy') ||
      errorMessage.includes('Lỗi validation') ||
      errorMessage.includes('bắt buộc') ||
      errorMessage.includes('Lỗi') ||
      errorMessage.includes('không hợp lệ')
    );
    const statusCode = is400Error ? 400 : 500;
    
    // Return safe JSON response
    try {
      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    } catch (jsonError) {
      console.error('Error serializing error response:', jsonError);
      return res.status(500).send('Internal Server Error');
    }
  }
});

/**
 * GET /v1/drafts
 * Lấy danh sách draft của user
 * 
 * Query: {
 *   templateId?: string,    // Filter by template
 *   status?: string         // Filter by status: draft|review|approved|signed
 * }
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    const { templateId, status } = req.query;

    const drafts = await getDraftsByUser(userId, companyId, {
      templateId,
      status,
    });

    return res.json({
      success: true,
      data: drafts,
    });
  } catch (error) {
    console.error('GET /v1/drafts error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error fetching drafts',
    });
  }
});

/**
 * GET /v1/drafts/:draftId
 * Lấy chi tiết draft (content + research + validation)
 */
router.get('/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;

    const draft = await getDraftDetail(draftId, userId);

    return res.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error(`GET /v1/drafts/:draftId error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error fetching draft',
    });
  }
});

/**
 * PATCH /v1/drafts/:draftId
 * Save/update draft content
 * 
 * Body: {
 *   content: string,        // HTML content từ TipTap editor
 *   changeSummary?: string  // Description của thay đổi
 * }
 */
router.patch('/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { content, title, changeSummary } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content bắt buộc',
      });
    }

    const updated = await saveDraft(draftId, userId, content, title, changeSummary);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error(`PATCH /v1/drafts/:draftId error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error saving draft',
    });
  }
});

/**
 * POST /v1/drafts/:draftId/validate
 * Validate draft content
 * - Check required clauses
 * - Check legal compliance
 * - Return validation result + suggestions
 */
router.post('/:draftId/validate', async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;
    const draft = await getDraftDetail(draftId, userId);

    const validation = await validateDraft(draft.template_id, draft.content);

    // Save validation result back to draft
    const { prisma } = await import('../lib/prisma.js');
    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: validation },
    });

    return res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error(`POST /v1/drafts/:draftId/validate error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error validating draft',
    });
  }
});

/**
 * POST /v1/drafts/:draftId/status
 * Update draft status
 * 
 * Body: {
 *   status: 'draft' | 'review' | 'approved' | 'signed'
 * }
 */
router.post('/:draftId/status', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['draft', 'review', 'approved', 'signed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const updated = await updateDraftStatus(draftId, status, userId);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error(`POST /v1/drafts/:draftId/status error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error updating draft status',
    });
  }
});

/**
 * POST /v1/drafts/:draftId/export
 * Export draft to DOCX or PDF
 * 
 * Query: {
 *   format: 'docx' | 'pdf'  // default: docx
 * }
 */
router.post('/:draftId/export', async (req, res) => {
  try {
    const { draftId } = req.params;
    const { format = 'docx' } = req.query;
    const userId = req.user.id;

    if (!['docx', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Format phải là docx hoặc pdf',
      });
    }

    // Get draft first to verify it exists and get details
    const draft = await getDraftDetail(draftId, userId);
    if (!draft) {
      return res.status(404).json({
        success: false,
        error: `Draft ${draftId} không tìm thấy`,
      });
    }

    const fileBuffer = await exportDraft(draftId, format);
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Không thể tạo file export',
      });
    }

    // Sanitize filename - remove special chars and encode
    const filename = (draft.title || 'document')
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace non-alphanumeric with underscore
      .substring(0, 100); // Limit length

    // Return file for download
    res.setHeader('Content-Type', format === 'docx' 
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error(`POST /v1/drafts/:draftId/export error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error exporting draft',
    });
  }
});

/**
 * GET /v1/drafts/:draftId/versions
 * Lấy history các version của draft
 */
router.get('/:draftId/versions', async (req, res) => {
  try {
    const { draftId } = req.params;

    const versions = await getDraftVersions(draftId);

    return res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error(`GET /v1/drafts/:draftId/versions error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error fetching versions',
    });
  }
});

/**
 * DELETE /v1/drafts/:draftId
 * Delete draft (cascade delete all versions)
 */
router.delete('/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;

    await deleteDraft(draftId);

    return res.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error) {
    console.error(`DELETE /v1/drafts/:draftId error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error deleting draft',
    });
  }
});

export default router;
