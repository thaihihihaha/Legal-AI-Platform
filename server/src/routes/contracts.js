import { Router } from 'express';
import { createRequire } from 'module';
import { unlink } from 'fs/promises';
import { reviewContract, extractContractMeta } from '../agents/legal_agent.js';
import {
  createContractFromUpload,
  getContractById,
  getRiskSummaryByCompany,
  listContractsByCompany,
  updateContractReview,
  updateContractFields,
  deleteContract,
} from '../services/contractsService.js';
import { setContractTags } from '../services/tagService.js';
import { resolveCompanyId } from '../services/tenantService.js';
import { createDiskUpload, toRelativePath, getFileUrl } from '../config/storage.js';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const mammoth = require('mammoth');

const router = Router();

// ─── Multer disk storage cho contracts ───────────────────────────────────────
const upload = createDiskUpload('contracts', {
  fileSizeMB: 20,
  allowedExts: ['pdf', 'doc', 'docx', 'txt', 'md'],
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
  if (ext === 'pdf') return parsePdfText(filePath);
  if (ext === 'docx' || ext === 'doc') {
    const data = await mammoth.extractRawText({ path: filePath });
    return data.value;
  }
  if (ext === 'txt' || ext === 'md') {
    const { readFile } = await import('fs/promises');
    return readFile(filePath, 'utf8');
  }
  throw new Error('Định dạng không được hỗ trợ.');
};

// ─── GET / — Danh sách hợp đồng ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const { category_id, tag_id, workflow_status, search, expiring_days } = req.query;
    const contracts = await listContractsByCompany(companyId, {
      categoryId: category_id,
      tagId: tag_id,
      workflowStatus: workflow_status,
      search,
      expiringDays: expiring_days ? Number(expiring_days) : null,
    });

    // Thêm file_url vào mỗi contract
    const result = contracts.map((c) => ({
      ...c,
      file_url: getFileUrl(c.file_path),
    }));

    res.json({ contracts: result });
  } catch (err) {
    res.status(500).json({ error: 'Không thể tải danh sách hợp đồng.' });
  }
});

// ─── GET /risk-summary ────────────────────────────────────────────────────────
router.get('/risk-summary', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });
    res.json(await getRiskSummaryByCompany(companyId));
  } catch {
    res.status(500).json({ error: 'Không thể tải tổng quan rủi ro.' });
  }
});

// ─── POST /parse-meta — AI phân tích file, KHÔNG lưu vào DB ─────────────────
// Dùng cho upload form: user chọn file → frontend gọi endpoint này → AI trả về
// các trường đã trích xuất để pre-fill form.
router.post('/parse-meta', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Chưa có file.' });

  const filePath = req.file.path;
  const ext = req.file.originalname.split('.').pop().toLowerCase();

  try {
    const text = await extractText(filePath, ext);
    // Xóa file tạm ngay sau khi đọc xong — không lưu DB
    await unlink(filePath).catch(() => {});

    const meta = await extractContractMeta(text);

    if (!meta) {
      return res.json({
        success: false,
        message: 'AI chưa được cấu hình hoặc không thể phân tích. Vui lòng điền thủ công.',
        fields: null,
      });
    }

    // Đánh dấu trường nào được tìm thấy (non-null) để frontend highlight
    const extracted = {};
    const missing = [];
    for (const [key, val] of Object.entries(meta)) {
      if (val !== null && val !== undefined) {
        extracted[key] = val;
      } else {
        missing.push(key);
      }
    }

    return res.json({
      success: true,
      fields: extracted,
      missing,
      textPreview: text.substring(0, 300),
    });
  } catch (err) {
    await unlink(filePath).catch(() => {});
    console.error('parse-meta error:', err.message);
    return res.status(500).json({ error: 'Không thể phân tích file.', message: err.message });
  }
});

// ─── POST /upload — Upload + lưu file trên disk ───────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
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

    // Lấy thêm metadata từ body (optional)
    const {
      category_id,
      tag_ids,           // JSON array string hoặc comma-separated
      party_a_name,
      party_b_name,
      party_b_tax_code,
      effective_date,
      expiry_date,
      signed_date,
      contract_value,
      currency,
      notes,
      workflow_status,
    } = req.body;

    const tagIds = tag_ids
      ? (typeof tag_ids === 'string'
          ? tag_ids.startsWith('[') ? JSON.parse(tag_ids) : tag_ids.split(',').map((s) => s.trim())
          : tag_ids)
      : [];

    const contract = await createContractFromUpload({
      companyId,
      userId: req.user?.id || null,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || ext,
      fileSize: req.file.size,
      filePath: relativePath,
      extractedText,
      categoryId: category_id || null,
      partyAName: party_a_name || null,
      partyBName: party_b_name || null,
      partyBTaxCode: party_b_tax_code || null,
      effectiveDate: effective_date || null,
      expiryDate: expiry_date || null,
      signedDate: signed_date || null,
      contractValue: contract_value ? Number(contract_value) : null,
      currency: currency || 'VND',
      notes: notes || null,
      workflowStatus: workflow_status || 'draft',
    });

    if (tagIds.length > 0 && contract?.id) {
      await setContractTags(contract.id, tagIds);
    }

    res.json({
      message: 'Tải văn bản thành công',
      contractId: contract?.id || null,
      fileName: req.file.originalname,
      file_url: getFileUrl(relativePath),
      textPreview: extractedText.substring(0, 500) + '...',
      textLength: extractedText.length,
    });
  } catch (err) {
    await unlink(filePath).catch(() => {}); // dọn file nếu lỗi
    console.error(err);
    res.status(500).json({ error: 'Quá trình xử lý file thất bại.' });
  }
});

// ─── PATCH /:id — Cập nhật thông tin hợp đồng ────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const { tag_ids, ...fields } = req.body;
    const contract = await updateContractFields(companyId, req.params.id, fields);

    if (tag_ids !== undefined) {
      const ids = Array.isArray(tag_ids) ? tag_ids : JSON.parse(tag_ids || '[]');
      await setContractTags(req.params.id, ids);
    }

    res.json({ contract: { ...contract, file_url: getFileUrl(contract.file_path) } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });
    const deleted = await deleteContract(companyId, req.params.id);
    // Xoá file vật lý nếu có
    if (deleted?.file_path) {
      const { getAbsolutePath } = await import('../config/storage.js');
      await unlink(getAbsolutePath(deleted.file_path)).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /:id/review — AI review ────────────────────────────────────────────
router.post('/:id/review', async (req, res) => {
  const { contractText } = req.body;
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không tìm thấy company_id.' });

    const contract = await getContractById(companyId, req.params.id);
    if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng.' });

    // extracted_text / content không nằm trong CONTRACT_SELECT (tránh bloat list query)
    // → fetch riêng chỉ khi cần review
    let text = contractText || '';
    if (!text.trim()) {
      const { prisma } = await import('../lib/prisma.js');
      const raw = await prisma.contract.findFirst({
        where: { id: req.params.id, company_id: companyId, deleted_at: null },
        select: { extracted_text: true, content: true },
      });
      text = raw?.extracted_text || raw?.content || '';
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'Thiếu nội dung hợp đồng để AI phân tích.' });
    }

    const reviewResult = await reviewContract(text.trim());
    await updateContractReview(companyId, req.params.id, reviewResult);

    res.json({ result: reviewResult, message: 'AI rà soát thành công.' });
  } catch (err) {
    console.error('review error:', err.message);
    res.status(500).json({ error: 'AI hiện tại đang bận, không thể phân tích.' });
  }
});

export default router;
