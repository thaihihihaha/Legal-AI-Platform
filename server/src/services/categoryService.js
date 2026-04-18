import { prisma } from '../lib/prisma.js';

const MAX_DEPTH = 3;

/** Tính depth của một node bằng cách đếm ancestor */
const getDepth = async (categoryId) => {
  let depth = 0;
  let current = categoryId;
  while (current) {
    const row = await prisma.$queryRaw`
      SELECT parent_id FROM categories WHERE id = ${current}::uuid LIMIT 1
    `;
    const parentId = row?.[0]?.parent_id ?? null;
    if (!parentId) break;
    current = parentId;
    depth++;
    if (depth >= MAX_DEPTH) break;
  }
  return depth;
};

export const listCategories = async (companyId, resourceType) => {
  const rows = await prisma.category.findMany({
    where: { company_id: companyId, resource_type: resourceType },
    orderBy: [{ order_index: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { contracts: true, documents: true } },
    },
  });
  return rows;
};

/** Trả về cây phân cấp dạng nested */
export const getCategoryTree = async (companyId, resourceType) => {
  const flat = await listCategories(companyId, resourceType);
  const map = new Map(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const item of map.values()) {
    if (item.parent_id) {
      map.get(item.parent_id)?.children.push(item);
    } else {
      roots.push(item);
    }
  }
  return roots;
};

export const createCategory = async (companyId, { name, parent_id, resource_type, description, color, icon }) => {
  // Kiểm tra depth
  if (parent_id) {
    const depth = await getDepth(parent_id);
    if (depth >= MAX_DEPTH - 1) {
      throw new Error(`Danh mục chỉ hỗ trợ tối đa ${MAX_DEPTH} cấp.`);
    }
    // Xác nhận parent thuộc company
    const parent = await prisma.category.findFirst({
      where: { id: parent_id, company_id: companyId },
    });
    if (!parent) throw new Error('Danh mục cha không tồn tại.');
  }

  return prisma.category.create({
    data: {
      company_id: companyId,
      parent_id: parent_id || null,
      resource_type: resource_type || 'contract',
      name: name.trim(),
      description: description || null,
      color: color || null,
      icon: icon || null,
    },
  });
};

export const updateCategory = async (companyId, categoryId, patch) => {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, company_id: companyId },
  });
  if (!existing) throw new Error('Danh mục không tồn tại.');

  const { name, description, color, icon, order_index } = patch;
  return prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(order_index !== undefined && { order_index }),
    },
  });
};

export const deleteCategory = async (companyId, categoryId) => {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, company_id: companyId },
  });
  if (!existing) throw new Error('Danh mục không tồn tại.');

  // Kiểm tra có child hoặc contract không
  const childCount = await prisma.category.count({ where: { parent_id: categoryId } });
  if (childCount > 0) throw new Error('Hãy xoá danh mục con trước khi xoá danh mục này.');

  return prisma.category.delete({ where: { id: categoryId } });
};
