import { prisma } from '../lib/prisma.js';

const DOCUMENT_SELECT = {
  id: true,
  name: true,
  file_path: true,
  file_size: true,
  mime_type: true,
  status: true,
  workflow_status: true,
  analysis: true,
  notes: true,
  source_contract_id: true,
  uploaded_by: true,
  created_at: true,
  updated_at: true,
  analyzed_at: true,
  category: {
    select: { id: true, name: true, color: true, icon: true },
  },
  tags: {
    select: {
      tag: { select: { id: true, name: true, color: true } },
    },
  },
  source_contract: {
    select: { id: true, name: true, contract_type: true, workflow_status: true },
  },
};

/** Flatten tags từ junction vào array */
const flattenDocument = (d) => ({
  ...d,
  tags: (d.tags || []).map((t) => t.tag),
});

// ─── List ──────────────────────────────────────────────────────────────────────
export const listDocumentsByCompany = async (companyId, filters = {}) => {
  const { categoryId, tagId, workflowStatus, search } = filters;

  const where = {
    company_id: companyId,
    deleted_at: null,
  };

  if (categoryId) where.category_id = categoryId;
  if (workflowStatus) where.workflow_status = workflowStatus;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { extracted_text: { contains: search, mode: 'insensitive' } },
    ];
  }

  let documents = await prisma.document.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 200,
    select: DOCUMENT_SELECT,
  });

  // Filter by tag nếu cần (qua junction)
  if (tagId) {
    documents = documents.filter((d) => d.tags?.some((t) => t.tag?.id === tagId));
  }

  return documents.map(flattenDocument);
};

// ─── Create ────────────────────────────────────────────────────────────────────
export const createDocumentFromUpload = async ({
  companyId,
  userId,
  originalName,
  mimeType,
  fileSize,
  filePath,      // relative path for disk storage
  extractedText,
  categoryId,
  notes,
  workflowStatus,
}) => {
  return prisma.document.create({
    data: {
      company_id: companyId,
      uploaded_by: userId,
      category_id: categoryId || null,
      name: originalName,
      mime_type: mimeType,
      file_path: filePath || null,
      file_size: fileSize || null,
      extracted_text: extractedText,
      content: extractedText,
      status: 'active',
      workflow_status: workflowStatus || 'draft',
      notes: notes || null,
      analysis: null,
      metadata: { source: 'upload', size: fileSize },
    },
    select: { id: true, name: true, created_at: true },
  });
};

// ─── Get by ID ────────────────────────────────────────────────────────────────
export const getDocumentById = async (companyId, documentId) => {
  const d = await prisma.document.findFirst({
    where: { id: documentId, company_id: companyId, deleted_at: null },
    select: DOCUMENT_SELECT,
  });
  return d ? flattenDocument(d) : null;
};

// ─── Update fields ────────────────────────────────────────────────────────────
export const updateDocumentFields = async (companyId, documentId, patch) => {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, company_id: companyId, deleted_at: null },
  });
  if (!existing) throw new Error('Tài liệu không tồn tại.');

  const allowed = [
    'name', 'workflow_status', 'status', 'notes', 'category_id'
  ];

  const data = { updated_at: new Date() };
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      data[key] = patch[key];
    }
  }

  const d = await prisma.document.update({
    where: { id: documentId },
    data,
    select: DOCUMENT_SELECT,
  });
  return flattenDocument(d);
};

// ─── Update analysis results ───────────────────────────────────────────────────
export const updateDocumentAnalysis = async (companyId, documentId, analysisResult) => {
  return prisma.document.update({
    where: { id: documentId },
    data: {
      analysis: {
        ...analysisResult,
        analyzed_at: new Date().toISOString(),
        analyzer: 'ai',
      },
      analyzed_at: new Date(),
      updated_at: new Date(),
    },
    select: DOCUMENT_SELECT,
  }).then(flattenDocument);
};

// ─── Soft delete ──────────────────────────────────────────────────────────────
export const deleteDocument = async (companyId, documentId) => {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, company_id: companyId, deleted_at: null },
    select: { id: true, file_path: true, source_contract_id: true, uploaded_by: true },
  });
  if (!existing) throw new Error('Tài liệu không tồn tại.');

  const now = new Date();
  const ops = [
    prisma.document.update({
      where: { id: documentId },
      data: { deleted_at: now },
    }),
  ];

  // Nếu document liên kết với hợp đồng → cascade soft-delete hợp đồng
  if (existing.source_contract_id) {
    ops.push(
      prisma.contract.updateMany({
        where: { id: existing.source_contract_id, deleted_at: null },
        data: { deleted_at: now },
      })
    );
  }

  await prisma.$transaction(ops);
  return existing; // trả về để route quyết định xoá file vật lý
};

// ─── Get analysis results ──────────────────────────────────────────────────────
export const getDocumentAnalysis = async (companyId, documentId) => {
  const d = await prisma.document.findFirst({
    where: { id: documentId, company_id: companyId, deleted_at: null },
    select: { id: true, name: true, analysis: true, analyzed_at: true },
  });
  return d?.analysis || null;
};
