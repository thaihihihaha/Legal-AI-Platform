import { Router } from 'express';
import { resolveCompanyId } from '../services/tenantService.js';
import { listTags, createTag, updateTag, deleteTag } from '../services/tagService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    res.json({ tags: await listTags(companyId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    const tag = await createTag(companyId, req.body);
    res.status(201).json({ tag });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    const tag = await updateTag(companyId, req.params.id, req.body);
    res.json({ tag });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) return res.status(400).json({ error: 'Không xác định được công ty.' });
    await deleteTag(companyId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
