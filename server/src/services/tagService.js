import { prisma } from '../lib/prisma.js';

export const listTags = async (companyId) =>
  prisma.tag.findMany({
    where: { company_id: companyId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { contract_tags: true, document_tags: true } },
    },
  });

export const createTag = async (companyId, { name, color }) => {
  if (!name?.trim()) throw new Error('Tên tag không được để trống.');
  return prisma.tag.create({
    data: { company_id: companyId, name: name.trim(), color: color || null },
  });
};

export const updateTag = async (companyId, tagId, { name, color }) => {
  const existing = await prisma.tag.findFirst({ where: { id: tagId, company_id: companyId } });
  if (!existing) throw new Error('Tag không tồn tại.');
  return prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(color !== undefined && { color }),
    },
  });
};

export const deleteTag = async (companyId, tagId) => {
  const existing = await prisma.tag.findFirst({ where: { id: tagId, company_id: companyId } });
  if (!existing) throw new Error('Tag không tồn tại.');
  return prisma.tag.delete({ where: { id: tagId } });
};

/** Gắn / bỏ tags cho contract — idempotent */
export const setContractTags = async (contractId, tagIds = []) => {
  await prisma.contractTag.deleteMany({ where: { contract_id: contractId } });
  if (tagIds.length === 0) return;
  await prisma.contractTag.createMany({
    data: tagIds.map((tag_id) => ({ contract_id: contractId, tag_id })),
    skipDuplicates: true,
  });
};

/** Gắn / bỏ tags cho document — idempotent */
export const setDocumentTags = async (documentId, tagIds = []) => {
  await prisma.documentTag.deleteMany({ where: { document_id: documentId } });
  if (tagIds.length === 0) return;
  await prisma.documentTag.createMany({
    data: tagIds.map((tag_id) => ({ document_id: documentId, tag_id })),
    skipDuplicates: true,
  });
};
