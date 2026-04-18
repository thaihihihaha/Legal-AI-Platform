import { Router } from 'express';
import {
  createApiKeyForCompany,
  listApiKeysByCompany,
  revokeApiKey,
  updateApiKey,
} from '../services/apiKeyService.js';
import { getUsageDashboard } from '../services/usageService.js';
import { resolveCompanyId } from '../services/tenantService.js';

const router = Router();

router.get('/api-keys', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ error: 'Không tìm thấy company_id cho tài khoản hiện tại.' });
    }

    const items = await listApiKeysByCompany(companyId);
    res.json({
      api_keys: items.map((item) => ({
        ...item,
        masked_key: `lga_${item.key_prefix}_********`,
      })),
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách API key:', error);
    res.status(500).json({ error: 'Không thể tải danh sách API key.' });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ error: 'Không tìm thấy company_id cho tài khoản hiện tại.' });
    }

    const {
      name,
      permissions = ['read', 'ask', 'review'],
      rate_limit = 60,
      expires_at = null,
    } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tên API key là bắt buộc.' });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ error: 'permissions phải là mảng không rỗng.' });
    }

    const payload = await createApiKeyForCompany({
      companyId,
      name: name.trim(),
      permissions,
      rateLimit: Number(rate_limit) || 60,
      expiresAt: expires_at ? new Date(expires_at) : null,
    });

    res.status(201).json({
      api_key: payload,
      warning: 'Khóa chỉ hiển thị 1 lần. Hãy lưu lại ngay.',
    });
  } catch (error) {
    console.error('Lỗi tạo API key:', error);
    res.status(500).json({ error: 'Không thể tạo API key.' });
  }
});

router.patch('/api-keys/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ error: 'Không tìm thấy company_id cho tài khoản hiện tại.' });
    }

    const patch = {
      name: req.body?.name,
      permissions: req.body?.permissions,
      rate_limit: req.body?.rate_limit,
      is_active: req.body?.is_active,
      expires_at: req.body?.expires_at ? new Date(req.body.expires_at) : req.body?.expires_at,
    };

    const result = await updateApiKey({
      companyId,
      keyId: req.params.id,
      patch,
    });

    if (!result.count) {
      return res.status(404).json({ error: 'Không tìm thấy API key để cập nhật.' });
    }

    res.json({ message: 'Cập nhật API key thành công.' });
  } catch (error) {
    console.error('Lỗi cập nhật API key:', error);
    res.status(500).json({ error: 'Không thể cập nhật API key.' });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ error: 'Không tìm thấy company_id cho tài khoản hiện tại.' });
    }

    const result = await revokeApiKey({
      companyId,
      keyId: req.params.id,
    });

    if (!result.count) {
      return res.status(404).json({ error: 'Không tìm thấy API key để thu hồi.' });
    }

    res.json({ message: 'Thu hồi API key thành công.' });
  } catch (error) {
    console.error('Lỗi thu hồi API key:', error);
    res.status(500).json({ error: 'Không thể thu hồi API key.' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ error: 'Không tìm thấy company_id cho tài khoản hiện tại.' });
    }

    const days = Number(req.query.days || 7);
    const payload = await getUsageDashboard({ companyId, days });
    res.json(payload);
  } catch (error) {
    console.error('Lỗi tải usage dashboard:', error);
    res.status(500).json({ error: 'Không thể tải usage dashboard.' });
  }
});

export default router;
