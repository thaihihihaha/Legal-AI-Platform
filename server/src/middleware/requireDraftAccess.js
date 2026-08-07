import { checkDraftAccess } from '../services/collaborationService.js';

/**
 * Chặn truy cập draft khi user không phải owner, không có access-grant còn hiệu lực,
 * và không cùng company với draft. Dùng cho mọi route thao tác theo :draftId
 * (drafts.js + phase3.js) — trước khi middleware này, các route đó gọi thẳng
 * service theo draftId mà không kiểm tra company_id/ownership, cho phép user của
 * một công ty đọc/sửa/xóa draft của công ty khác (cross-tenant IDOR).
 *
 * Trả 404 (không phải 403) khi không có quyền để tránh lộ thông tin draft có tồn tại hay không.
 */
export const requireDraftAccess = (paramName = 'draftId') => async (req, res, next) => {
  try {
    const draftId = req.params[paramName] || req.body?.draftId;

    if (!draftId) {
      return res.status(400).json({ success: false, error: 'draftId là bắt buộc.' });
    }

    const { hasAccess, role } = await checkDraftAccess(draftId, req.user.id);

    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        error: 'Draft không tồn tại hoặc bạn không có quyền truy cập.',
      });
    }

    req.draftAccessRole = role;
    next();
  } catch (error) {
    console.error('requireDraftAccess error:', error);
    return res.status(500).json({ success: false, error: 'Không thể xác thực quyền truy cập draft.' });
  }
};
