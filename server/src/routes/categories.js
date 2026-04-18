import { Router } from 'express';
import { resolveCompanyId } from '../services/tenantService.js';
import { getCategoryTree, createCategory, updateCategory, deleteCategory } from '../services/categoryService.js';

const router = Router();

// GET /v1/categories/:resourceType  — cây danh mục
router.get('/:resourceType', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    const tree = await getCategoryTree(companyId, req.params.resourceType);
    res.json({ categories: tree });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/categories
router.post('/', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    const { name, parent_id, resource_type, description, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên danh mục là bắt buộc.' });
    const category = await createCategory(companyId, { name, parent_id, resource_type, description, color, icon });
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /v1/categories/:id
router.patch('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    const category = await updateCategory(companyId, req.params.id, req.body);
    res.json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /v1/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    await deleteCategory(companyId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
