import { Router } from 'express';
import {
  exportDraftAsDocx,
  exportDraftAsPdf,
  generateTemplateDraft,
  listTemplates,
} from '../services/templateService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const templates = await listTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Lỗi tải templates:', error);
    res.status(500).json({ error: 'Không thể tải danh sách template.' });
  }
});

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

router.post('/:templateId/export', async (req, res) => {
  const { format = 'docx', text = '', title = 'Generated Document' } = req.body || {};

  // Cho phép string rỗng '', nhưng reject null/undefined
  if (text === null || text === undefined || typeof text !== 'string') {
    return res.status(400).json({ 
      error: 'Trường "text" là bắt buộc và phải là một string.' 
    });
  }

  // Cảnh báo nếu text quá ngắn
  if (text.trim().length === 0) {
    console.warn(`[WARN] Xuất văn bản rỗng cho: ${title}`);
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
