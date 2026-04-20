import { prisma } from '../lib/prisma.js';

const inferContractType = (filename) => {
  const text = filename.toLowerCase();
  if (text.includes('lao dong') || text.includes('labour')) return 'hop_dong_lao_dong';
  if (text.includes('dich vu') || text.includes('service')) return 'hop_dong_dich_vu';
  if (text.includes('thuong mai') || text.includes('commercial')) return 'hop_dong_thuong_mai';
  if (text.includes('mua ban') || text.includes('sale')) return 'hop_dong_mua_ban';
  if (text.includes('thue') || text.includes('lease')) return 'hop_dong_thue';
  if (text.includes('bao hiem') || text.includes('insurance')) return 'hop_dong_bao_hiem';
  if (text.includes('nda') || text.includes('bao mat')) return 'hop_dong_bao_mat';
  return 'other';
};

const CONTRACT_SELECT = {
  id: true,
  name: true,
  contract_type: true,
  file_path: true,
  file_size: true,
  file_type: true,
  status: true,
  workflow_status: true,
  review_result: true,
  notes: true,
  effective_date: true,
  expiry_date: true,
  signed_date: true,
  party_a_name: true,
  party_b_name: true,
  party_b_tax_code: true,
  contract_value: true,
  currency: true,
  created_at: true,
  updated_at: true,
  category: {
    select: { id: true, name: true, color: true, icon: true },
  },
  tags: {
    select: {
      tag: { select: { id: true, name: true, color: true } },
    },
  },
};

/** Flatten tags từ junction vào array */
const flattenContract = (c) => ({
  ...c,
  tags: (c.tags || []).map((t) => t.tag),
  contract_value: c.contract_value ? Number(c.contract_value) : null,
});

// ─── List ──────────────────────────────────────────────────────────────────────
export const listContractsByCompany = async (companyId, filters = {}) => {
  const { categoryId, tagId, workflowStatus, search, expiringDays } = filters;

  const where = {
    company_id: companyId,
    deleted_at: null,
  };

  if (categoryId) where.category_id = categoryId;
  if (workflowStatus) where.workflow_status = workflowStatus;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { party_b_name: { contains: search, mode: 'insensitive' } },
      { party_a_name: { contains: search, mode: 'insensitive' } },
      { party_b_tax_code: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (expiringDays) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + expiringDays);
    where.expiry_date = { lte: deadline };
    where.NOT = { expiry_date: null };
  }

  let contracts = await prisma.contract.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 200,
    select: CONTRACT_SELECT,
  });

  // Filter by tag nếu cần (qua junction)
  if (tagId) {
    contracts = contracts.filter((c) => c.tags?.some((t) => t.tag?.id === tagId));
  }

  return contracts.map(flattenContract);
};

// ─── Create ────────────────────────────────────────────────────────────────────
export const createContractFromUpload = async ({
  companyId,
  userId,
  originalName,
  mimeType,
  fileSize,
  filePath,      // relative path for disk storage
  extractedText,
  categoryId,
  partyAName,
  partyBName,
  partyBTaxCode,
  effectiveDate,
  expiryDate,
  signedDate,
  contractValue,
  currency,
  notes,
  workflowStatus,
}) => {
  const contractType = inferContractType(originalName);

  // Dùng transaction: tạo contract + document liên kết cùng lúc
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.create({
      data: {
        company_id: companyId,
        uploaded_by: userId,
        category_id: categoryId || null,
        name: originalName,
        contract_type: contractType,
        file_type: mimeType,
        file_path: filePath || null,
        file_size: fileSize || null,
        extracted_text: extractedText,
        content: extractedText,
        status: 'active',
        workflow_status: workflowStatus || 'draft',
        notes: notes || null,
        party_a_name: partyAName || null,
        party_b_name: partyBName || null,
        party_b_tax_code: partyBTaxCode || null,
        effective_date: effectiveDate ? new Date(effectiveDate) : null,
        expiry_date: expiryDate ? new Date(expiryDate) : null,
        signed_date: signedDate ? new Date(signedDate) : null,
        contract_value: contractValue || null,
        currency: currency || 'VND',
        metadata: { source: 'upload', size: fileSize },
      },
      select: { id: true, name: true, created_at: true },
    });

    // Tạo Document record liên kết — cùng file_path, không copy file vật lý
    await tx.document.create({
      data: {
        company_id: companyId,
        uploaded_by: userId,
        category_id: categoryId || null,
        source_contract_id: contract.id,
        name: originalName,
        mime_type: mimeType,
        file_path: filePath || null,
        file_size: fileSize || null,
        extracted_text: extractedText,
        content: extractedText,
        status: 'active',
        workflow_status: workflowStatus || 'draft',
        notes: notes || null,
        metadata: { source: 'contract_upload', contract_id: contract.id },
      },
    });

    return contract;
  });
};

// ─── Get by ID ────────────────────────────────────────────────────────────────
export const getContractById = async (companyId, contractId) => {
  const c = await prisma.contract.findFirst({
    where: { id: contractId, company_id: companyId, deleted_at: null },
    select: CONTRACT_SELECT,
  });
  return c ? flattenContract(c) : null;
};

// ─── Update fields ────────────────────────────────────────────────────────────
export const updateContractFields = async (companyId, contractId, patch) => {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, company_id: companyId, deleted_at: null },
  });
  if (!existing) throw new Error('Hợp đồng không tồn tại.');

  const allowed = [
    'name', 'contract_type', 'status', 'workflow_status', 'notes',
    'category_id', 'party_a_name', 'party_b_name', 'party_b_tax_code',
    'effective_date', 'expiry_date', 'signed_date',
    'contract_value', 'currency',
  ];

  const data = { updated_at: new Date() };
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      if (['effective_date', 'expiry_date', 'signed_date'].includes(key)) {
        data[key] = patch[key] ? new Date(patch[key]) : null;
      } else if (key === 'contract_value') {
        data[key] = patch[key] ? Number(patch[key]) : null;
      } else {
        data[key] = patch[key];
      }
    }
  }

  const c = await prisma.contract.update({
    where: { id: contractId },
    data,
    select: CONTRACT_SELECT,
  });
  return flattenContract(c);
};

// ─── Update review ────────────────────────────────────────────────────────────
export const updateContractReview = async (companyId, contractId, reviewResult) => {
  return prisma.contract.updateMany({
    where: { id: contractId, company_id: companyId, deleted_at: null },
    data: {
      review_result: { ...reviewResult, reviewedAt: new Date().toISOString(), reviewer: 'ai' },
      workflow_status: 'pending_review',
      updated_at: new Date(),
    },
  });
};

// ─── Soft delete ──────────────────────────────────────────────────────────────
export const deleteContract = async (companyId, contractId) => {
  const existing = await prisma.contract.findFirst({
    where: { id: contractId, company_id: companyId, deleted_at: null },
    select: { id: true, file_path: true },
  });
  if (!existing) throw new Error('Hợp đồng không tồn tại.');

  const now = new Date();
  await prisma.$transaction([
    // Soft-delete hợp đồng
    prisma.contract.update({
      where: { id: contractId },
      data: { deleted_at: now },
    }),
    // Cascade soft-delete document liên kết (nếu có)
    prisma.document.updateMany({
      where: { source_contract_id: contractId, deleted_at: null },
      data: { deleted_at: now },
    }),
  ]);

  return existing; // trả về để route xoá file vật lý
};

// ─── Risk summary ─────────────────────────────────────────────────────────────
const classifyRisk = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const getRiskSummaryByCompany = async (companyId) => {
  const contracts = await prisma.contract.findMany({
    where: { company_id: companyId, deleted_at: null },
    select: { id: true, name: true, contract_type: true, created_at: true, review_result: true, expiry_date: true },
    orderBy: { created_at: 'desc' },
  });

  const summary = {
    total_contracts: contracts.length, reviewed_contracts: 0,
    pending_review_contracts: 0, high_risk_count: 0,
    medium_risk_count: 0, low_risk_count: 0, unknown_risk_count: 0,
    average_risk_score: 0,
    expiring_30_days: 0, expiring_60_days: 0, expired_count: 0,
  };

  const now = new Date();
  const d30 = new Date(now); d30.setDate(now.getDate() + 30);
  const d60 = new Date(now); d60.setDate(now.getDate() + 60);

  const byTypeMap = new Map();
  const trendMap = new Map();
  let scoreTotal = 0, scoreCount = 0;

  for (const contract of contracts) {
    const rawScore = contract.review_result?.risk_score;
    const riskBand = classifyRisk(rawScore);
    const dayKey = contract.created_at ? new Date(contract.created_at).toISOString().slice(0, 10) : null;

    // Expiry tracking
    if (contract.expiry_date) {
      const exp = new Date(contract.expiry_date);
      if (exp < now) summary.expired_count++;
      else if (exp <= d30) summary.expiring_30_days++;
      else if (exp <= d60) summary.expiring_60_days++;
    }

    const contractType = contract.contract_type || 'other';
    if (!byTypeMap.has(contractType)) {
      byTypeMap.set(contractType, { contract_type: contractType, total_contracts: 0, reviewed_contracts: 0, average_risk_score: 0, high_risk_count: 0 });
    }
    const typeRec = byTypeMap.get(contractType);
    typeRec.total_contracts++;

    if (riskBand === 'high') { summary.high_risk_count++; typeRec.high_risk_count++; }
    else if (riskBand === 'medium') summary.medium_risk_count++;
    else if (riskBand === 'low') summary.low_risk_count++;
    else summary.unknown_risk_count++;

    if (typeof rawScore === 'number' && !Number.isNaN(rawScore)) {
      summary.reviewed_contracts++;
      scoreTotal += rawScore; scoreCount++;
      typeRec.reviewed_contracts++; typeRec.average_risk_score += rawScore;

      if (dayKey) {
        if (!trendMap.has(dayKey)) trendMap.set(dayKey, { date: dayKey, reviewed_contracts: 0, average_risk_score: 0, high_risk_count: 0 });
        const t = trendMap.get(dayKey);
        t.reviewed_contracts++; t.average_risk_score += rawScore;
        if (riskBand === 'high') t.high_risk_count++;
      }
    }
  }

  summary.pending_review_contracts = summary.total_contracts - summary.reviewed_contracts;
  summary.average_risk_score = scoreCount > 0 ? Number((scoreTotal / scoreCount).toFixed(2)) : 0;

  return {
    summary,
    by_type: Array.from(byTypeMap.values()).map((r) => ({
      ...r, average_risk_score: r.reviewed_contracts > 0 ? Number((r.average_risk_score / r.reviewed_contracts).toFixed(2)) : 0,
    })).sort((a, b) => b.total_contracts - a.total_contracts),
    trend: Array.from(trendMap.values()).map((r) => ({
      ...r, average_risk_score: r.reviewed_contracts > 0 ? Number((r.average_risk_score / r.reviewed_contracts).toFixed(2)) : 0,
    })).sort((a, b) => a.date > b.date ? 1 : -1),
    contracts,
  };
};
