import { prisma } from '../lib/prisma.js';

export const listCustomTemplates = async (companyId) => {
  const rows = await prisma.template.findMany({
    where: { company_id: companyId, status: 'active' },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, name: true, category: true, description: true,
      content: true, variables: true, is_system: true,
      created_at: true, updated_at: true,
      creator: { select: { full_name: true } },
    },
  });
  return rows;
};

export const createTemplate = async (companyId, userId, data) => {
  return prisma.template.create({
    data: {
      company_id: companyId,
      created_by: userId,
      name: data.name,
      category: data.category || 'other',
      description: data.description || null,
      content: data.content || '',
      variables: data.variables || [],
    },
    select: { id: true, name: true, category: true, description: true, content: true, variables: true, created_at: true },
  });
};

export const updateTemplate = async (companyId, templateId, data) => {
  const existing = await prisma.template.findFirst({
    where: { id: templateId, company_id: companyId, status: 'active' },
  });
  if (!existing) throw new Error('Mẫu không tồn tại.');

  const allowed = ['name', 'category', 'description', 'content', 'variables'];
  const patch = { updated_at: new Date() };
  for (const key of allowed) {
    if (data[key] !== undefined) patch[key] = data[key];
  }

  return prisma.template.update({
    where: { id: templateId },
    data: patch,
    select: { id: true, name: true, category: true, description: true, content: true, variables: true, updated_at: true },
  });
};

export const deleteTemplate = async (companyId, templateId) => {
  const existing = await prisma.template.findFirst({
    where: { id: templateId, company_id: companyId },
  });
  if (!existing) throw new Error('Mẫu không tồn tại.');
  return prisma.template.update({
    where: { id: templateId },
    data: { status: 'deleted', updated_at: new Date() },
  });
};

export const getTemplateById = async (companyId, templateId) => {
  return prisma.template.findFirst({
    where: { id: templateId, company_id: companyId },
    select: { id: true, created_by: true, status: true },
  });
};

export const countTemplates = async (companyId) => {
  return prisma.template.count({ where: { company_id: companyId, status: 'active' } });
};
