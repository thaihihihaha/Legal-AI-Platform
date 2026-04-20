import { Router } from 'express';
import {
  exportDraftAsDocx,
  exportDraftAsPdf,
  generateTemplateDraft,
  listTemplates as listSystemTemplates,
} from '../services/templateServiceV2.js';
import {
  listCustomTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  countTemplates,
  getTemplateById,
} from '../services/templateDbService.js';
import { resolveCompanyId } from '../services/tenantService.js';
import { requireAction, checkOwnershipOrAdmin } from '../middleware/rolePermissions.js';

const router = Router();

// ─── GET / — System templates + user-created templates ────────────────────────
router.get('/', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);

    const [systemTemplates, customTemplates] = await Promise.all([
      listSystemTemplates(),
      companyId ? listCustomTemplates(companyId) : [],
    ]);

    // Mark system templates and normalize shape
    const system = systemTemplates.map((t) => ({
      ...t,
      is_system: true,
      is_custom: false,
    }));

    // Custom templates from DB
    const custom = customTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description || '',
      content: t.content,
      variables: Array.isArray(t.variables) ? t.variables : [],
      required_fields: Array.isArray(t.variables) ? t.variables.map((v) => v.key || v) : [],
      sections: [],
      icon: '📝',
      is_system: false,
      is_custom: true,
      created_at: t.created_at,
      created_by: t.creator?.full_name || null,
    }));

    res.json({ templates: [...system, ...custom] });
  } catch (error) {
    console.error('Lỗi tải templates:', error);
    res.status(500).json({ error: 'Không thể tải danh sách template.' });
  }
});

// ─── GET /count — Đếm tổng templates (system + custom) ────────────────────────
router.get('/count', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    const [systemTemplates, customCount] = await Promise.all([
      listSystemTemplates(),
      companyId ? countTemplates(companyId) : 0,
    ]);
    res.json({ count: systemTemplates.length + customCount });
  } catch (error) {
    res.status(500).json({ error: 'Không thể đếm templates.' });
  }
});

// ─── POST / — Tạo mẫu văn bản mới ─────────────────────────────────────────────
router.post('/', requireAction('create:templates'), async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const { name, category, description, content, variables } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tên mẫu là bắt buộc.' });

    const template = await createTemplate(companyId, req.user.id, {
      name: name.trim(), category, description, content, variables,
    });

    res.json({ template });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── PATCH /:id — Cập nhật mẫu ────────────────────────────────────────────────
router.patch('/:id', requireAction('edit:templates'), async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const template = await updateTemplate(companyId, req.params.id, req.body);
    res.json({ template });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /:id — Xóa mẫu ────────────────────────────────────────────────────
router.delete('/:id', requireAction('delete:templates'), async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const tmpl = await getTemplateById(companyId, req.params.id);
    if (!tmpl) return res.status(404).json({ error: 'Mẫu không tồn tại.' });

    const allowed = await checkOwnershipOrAdmin(req, tmpl.created_by);
    if (!allowed) return res.status(403).json({ error: 'Bạn chỉ có thể xóa mẫu do mình tạo.' });

    await deleteTemplate(companyId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /:templateId/generate ───────────────────────────────────────────────
router.post('/:templateId/generate', async (req, res) => {
  try {
    const payload = await generateTemplateDraft({
      templateId: req.params.templateId,
      variables: req.body?.variables || {},
    });

    if (!payload.validation.valid) {
      return res.status(400).json({
        template: payload.template,
        validation: payload.validation,
        text: payload.text,
      });
    }

    res.json(payload);
  } catch (error) {
    console.error('Lỗi generate template:', error);
    res.status(500).json({ error: error.message || 'Không thể tạo văn bản từ template.' });
  }
});

// ─── POST /:templateId/export ─────────────────────────────────────────────────
router.post('/:templateId/export', async (req, res) => {
  const { format = 'docx', text = '', title = 'Generated Document' } = req.body || {};

  if (text === null || text === undefined || typeof text !== 'string') {
    return res.status(400).json({ error: 'Trường "text" là bắt buộc và phải là một string.' });
  }

  try {
    if (format === 'pdf') {
      const buffer = await exportDraftAsPdf({ title, text });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.templateId}.pdf"`);
      return res.send(buffer);
    }

    const buffer = await exportDraftAsDocx({ title, text });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.templateId}.docx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Lỗi export template:', error);
    res.status(500).json({ error: 'Không thể export văn bản.' });
  }
});

export default router;
