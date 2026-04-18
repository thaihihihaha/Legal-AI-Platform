import { Router } from 'express';
import { createRequire } from 'module';
import { unlink } from 'fs/promises';
import { analyzeDocument } from '../agents/legal_agent.js';
import {
  createDocumentFromUpload,
  getDocumentById,
  listDocumentsByCompany,
  updateDocumentAnalysis,
  updateDocumentFields,
  deleteDocument,
  getDocumentAnalysis,
} from '../services/documentService.js';
import { setDocumentTags } from '../services/tagService.js';
import { resolveCompanyId } from '../services/tenantService.js';
import { createDiskUpload, toRelativePath, getFileUrl, getAbsolutePath } from '../config/storage.js';
import { requireAction } from '../middleware/rolePermissions.js';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const mammoth = require('mammoth');

const router = Router();

// ─── Multer disk storage cho documents ────────────────────────────────────────
const upload = createDiskUpload('documents', {
  fileSizeMB: 50, // documents có thể lớn hơn contracts
  allowedExts: ['pdf', 'doc', 'docx', 'txt', 'md', 'xlsx', 'pptx'],
});

// ─── Middleware: cache companyId cho multer destination ───────────────────────
router.use(async (req, _res, next) => {
  try {
    req.resolvedCompanyId = await resolveCompanyId(req.user);
  } catch {
    req.resolvedCompanyId = null;
  }
  next();
});

// ─── Text extractors ──────────────────────────────────────────────────────────
const parsePdfText = async (filePath) => {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  if (typeof pdfParseModule === 'function') {
    const data = await pdfParseModule(buffer);
    return String(data?.text || '');
  }
  if (pdfParseModule?.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try { return String((await parser.getText())?.text || ''); }
    finally { parser.destroy?.(); }
  }
  throw new Error('Không tương thích pdf-parse.');
};

const extractText = async (filePath, ext) => {
  try {
    if (ext === 'pdf') return await parsePdfText(filePath);
    if (ext === 'docx' || ext === 'doc') {
      const data = await mammoth.extractRawText({ path: filePath });
      return data.value;
    }
    if (ext === 'txt' || ext === 'md') {
      const { readFile } = await import('fs/promises');
      return await readFile(filePath, 'utf8');
    }
    // Các file khác trả về empty string (không extract)
    return '';
  } catch (err) {
    console.error('Error extracting text from', filePath, ':', err.message);
    throw err;
  }
};

// ─── GET / — Danh sách tài liệu ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const { category_id, tag_id, workflow_status, search } = req.query;
    const documents = await listDocumentsByCompany(companyId, {
      categoryId: category_id,
      tagId: tag_id,
      workflowStatus: workflow_status,
      search,
    });

    // Thêm file_url vào mỗi document
    const result = documents.map((d) => ({
      ...d,
      file_url: getFileUrl(d.file_path),
    }));

    res.json({ documents: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể tải danh sách tài liệu.' });
  }
});

// ─── POST /upload — Upload + lưu file trên disk ───────────────────────────────
router.post('/upload', requireAction('upload:documents'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Chưa có file nào được đính kèm.' });

  const filePath = req.file.path;
  const ext = req.file.originalname.split('.').pop().toLowerCase();

  try {
    const companyId = req.resolvedCompanyId;
    if (!companyId) {
      await unlink(filePath).catch(() => {});
      return res.status(400).json({ error: 'Không tìm thấy company_id.' });
    }

    const extractedText = await extractText(filePath, ext);
    const relativePath = toRelativePath(filePath);

    // Lấy metadata từ body (optional)
    const {
      category_id,
      tag_ids,           // JSON array string hoặc comma-separated
      notes,
      workflow_status,
    } = req.body;

    const tagIds = tag_ids
      ? (typeof tag_ids === 'string'
          ? tag_ids.startsWith('[') ? JSON.parse(tag_ids) : tag_ids.split(',').map((s) => s.trim())
          : tag_ids)
      : [];

    const document = await createDocumentFromUpload({
      companyId,
      userId: req.user?.id || null,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || ext,
      fileSize: req.file.size,
      filePath: relativePath,
      extractedText,
      categoryId: category_id || null,
      notes: notes || null,
      workflowStatus: workflow_status || 'draft',
    });

    if (tagIds.length > 0 && document?.id) {
      await setDocumentTags(document.id, tagIds);
    }

    res.json({
      message: 'Tải tài liệu thành công',
      documentId: document?.id || null,
      fileName: req.file.originalname,
      file_url: getFileUrl(relativePath),
      textPreview: extractedText.substring(0, 500) + '...',
      textLength: extractedText.length,
    });
  } catch (err) {
    await unlink(filePath).catch(() => {}); // dọn file nếu lỗi
    console.error('upload error:', err);
    res.status(500).json({ error: 'Quá trình xử lý file thất bại.' });
  }
});

// ─── GET /:id — Chi tiết tài liệu ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const document = await getDocumentById(companyId, req.params.id);
    if (!document) return res.status(404).json({ error: 'Không tìm thấy tài liệu.' });

    res.json({
      document: {
        ...document,
        file_url: getFileUrl(document.file_path),
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── PATCH /:id — Cập nhật metadata tài liệu ────────────────────────────────
router.patch('/:id', requireAction('edit:documents'), async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const { tag_ids, ...fields } = req.body;
    const document = await updateDocumentFields(companyId, req.params.id, fields);

    if (tag_ids !== undefined) {
      const ids = Array.isArray(tag_ids) ? tag_ids : JSON.parse(tag_ids || '[]');
      await setDocumentTags(req.params.id, ids);
    }

    res.json({
      document: {
        ...document,
        file_url: getFileUrl(document.file_path),
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', requireAction('delete:documents'), async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const deleted = await deleteDocument(companyId, req.params.id);

    // Xoá file vật lý nếu có
    if (deleted?.file_path) {
      await unlink(getAbsolutePath(deleted.file_path)).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /:id/analyze — AI phân tích tài liệu ─────────────────────────────
router.post('/:id/analyze', requireAction('analyze:documents'), async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const document = await getDocumentById(companyId, req.params.id);
    if (!document) return res.status(404).json({ error: 'Không tìm thấy tài liệu.' });

    // Lấy extracted_text từ database
    const { prisma } = await import('../lib/prisma.js');
    const raw = await prisma.document.findFirst({
      where: { id: req.params.id, company_id: companyId, deleted_at: null },
      select: { extracted_text: true, content: true, name: true },
    });

    if (!raw?.extracted_text && !raw?.content) {
      return res.status(400).json({ error: 'Thiếu nội dung tài liệu để AI phân tích.' });
    }

    const text = (raw?.extracted_text || raw?.content || '').trim();
    const fileName = raw?.name || 'document';

    const analysisResult = await analyzeDocument(fileName, text);

    if (!analysisResult) {
      return res.json({
        success: false,
        message: 'AI chưa được cấu hình hoặc không thể phân tích.',
        analysis: null,
      });
    }

    await updateDocumentAnalysis(companyId, req.params.id, analysisResult);

    res.json({
      success: true,
      analysis: analysisResult,
      message: 'AI phân tích thành công.',
    });
  } catch (err) {
    console.error('analyze error:', err);
    res.status(500).json({ error: 'Không thể phân tích tài liệu.' });
  }
});

// ─── GET /:id/analysis — Lấy kết quả phân tích ────────────────────────────
router.get('/:id/analysis', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const analysis = await getDocumentAnalysis(companyId, req.params.id);
    res.json({ analysis: analysis || null });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
