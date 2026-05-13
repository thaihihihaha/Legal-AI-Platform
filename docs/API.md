# API Reference — Legal AI Platform

<!-- AUTO-GENERATED: do not edit -->

Base URL: `http://localhost:8080` (dev) · `https://legalmb.cloud` (prod)
API version prefix: `/v1`

## Conventions

- **Auth**: Hầu hết route yêu cầu header `Authorization: Bearer <access_token>`. Route public: `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`. Route API-key-based: `/v1/integration/*`.
- **Multi-tenant**: Mọi request mang JWT → backend filter dữ liệu theo `company_id` của user.
- **Permission gating**: middleware `requireAction('<action>:<resource>')` kiểm soát theo role. Action điển hình: `upload:contracts`, `review:contracts`, `edit:templates`, `manage:api_keys`, `view:legal_ai`.
- **Error format**: `{ "error": "<message>" }` với status 4xx/5xx tương ứng. Server error mặc định: `500 { error: "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau." }`.
- **Upload**: `multipart/form-data` field `file`.
- **Body limit**: `1mb` JSON + urlencoded.

---

## 1. Auth — `/v1/auth`

Public routes. Rate-limited ở `login` + `verify-otp`.

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| POST | `/register` | `{ email, password, full_name, company_name? }` | Đăng ký user + (optional) tạo company |
| POST | `/login` | `{ email, password }` | Login → trả `{ access_token, refresh_token, user }` hoặc `{ require_otp: true, temp_token }` |
| POST | `/setup-2fa` | (auth) | Sinh TOTP secret + QR code |
| POST | `/verify-2fa-setup` | `{ otp }` | Verify lần đầu để bật 2FA |
| POST | `/verify-otp` | `{ otp, temp_token }` | Verify OTP sau login bước 1 |
| POST | `/refresh` | `{ refresh_token }` | Đổi access token mới |
| POST | `/logout` | `{ refresh_token }` | Huỷ refresh token |

---

## 2. Profile — `/v1/profile`

Auth required (`requireAuth` + `requireActive`).

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Lấy thông tin user hiện tại |
| PATCH | `/` | Cập nhật `full_name`, `phone_number`, `avatar_url`, `preferences` |
| POST | `/change-password` | `{ old_password, new_password }` |
| POST | `/setup-2fa` | Bật 2FA cho user hiện tại |
| POST | `/verify-2fa` | Verify khi setup |
| POST | `/disable-2fa` | Tắt 2FA (cần password) |

---

## 3. Contracts — `/v1/contracts`

Auth required. Permission action: `upload:contracts`, `edit:contracts`, `review:contracts`, `parse:documents`.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | List hợp đồng (filter theo `category`, `tag`, `status`, `q` pagination) |
| GET | `/risk-summary` | Tổng hợp rủi ro theo công ty (dashboard) |
| POST | `/parse-meta` (multipart `file`) | Parse metadata từ file (không lưu) |
| POST | `/upload` (multipart `file`) | Upload + lưu hợp đồng |
| PATCH | `/:id` | Cập nhật metadata |
| DELETE | `/:id` | Xoá (soft delete) |
| POST | `/:id/review` | Trigger AI review rủi ro |

---

## 4. Documents — `/v1/documents`

Auth required. Permission: `upload:documents`, `edit:documents`, `analyze:documents`.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/count` | Số lượng document theo công ty |
| GET | `/` | List documents |
| POST | `/upload` (multipart `file`) | Upload document |
| GET | `/:id` | Chi tiết document |
| GET | `/:id/download` | Download file gốc |
| PATCH | `/:id` | Cập nhật metadata |
| DELETE | `/:id` | Xoá document |
| POST | `/:id/analyze` | Trigger AI analyze |
| GET | `/:id/analysis` | Lấy kết quả analyze gần nhất |

---

## 5. Drafts — `/v1/drafts`

Auth required.

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/` | Tạo draft mới |
| GET | `/` | List drafts theo công ty |
| GET | `/:draftId` | Chi tiết draft |
| PATCH | `/:draftId` | Cập nhật nội dung draft |
| POST | `/:draftId/validate` | Validate nội dung (AI check) |
| POST | `/:draftId/status` | Chuyển trạng thái (draft → review → approved) |
| POST | `/:draftId/export` | Export PDF/DOCX |
| GET | `/:draftId/versions` | Lịch sử version |
| DELETE | `/:draftId` | Xoá draft |

---

## 6. Templates — `/v1/templates`

Auth required. Permission: `create:templates`, `edit:templates`, `delete:templates`.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | List templates |
| GET | `/count` | Số lượng template |
| POST | `/` | Tạo template mới |
| PATCH | `/:id` | Cập nhật template |
| DELETE | `/:id` | Xoá template |
| POST | `/:templateId/generate` | Generate document từ template + variables |
| POST | `/:templateId/export` | Export template ra PDF/DOCX |

---

## 7. Legal AI — `/v1/legal`

Auth required. Permission: `view:legal_ai`.

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| POST | `/ask` | `{ question, context?, conversation_id? }` | Hỏi đáp pháp lý với AI (retrieval + citation) |

---

## 8. Categories & Tags

Auth required.

### `/v1/categories`

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/:resourceType` | — | List category theo `resourceType` (`contracts` \| `documents` \| `templates`) |
| POST | `/` | `create:categories` | Tạo category |
| PATCH | `/:id` | `edit:categories` | Cập nhật |
| DELETE | `/:id` | `delete:categories` | Xoá |

### `/v1/tags`

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/` | — | List tags |
| POST | `/` | `create:tags` | Tạo tag |
| PATCH | `/:id` | `edit:tags` | Cập nhật |
| DELETE | `/:id` | `delete:tags` | Xoá |

---

## 9. Settings — `/v1/settings`

Auth required.

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| GET | `/api-keys` | `manage:api_keys` | List API key của company |
| POST | `/api-keys` | `manage:api_keys` | Tạo API key mới (trả `key` plaintext 1 lần) |
| PATCH | `/api-keys/:id` | `manage:api_keys` | Đổi tên / permissions / rate_limit |
| DELETE | `/api-keys/:id` | `manage:api_keys` | Revoke API key |
| GET | `/usage` | — | Quota & usage của company |

---

## 10. Admin — `/v1/admin`

Auth required + role admin/superadmin.

### User management

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/users` | List users của company (admin) hoặc tất cả (superadmin) |
| GET | `/users/:id` | Chi tiết user |
| POST | `/users` | Tạo user mới |
| PATCH | `/users/:id` | Cập nhật |
| DELETE | `/users/:id` | Xoá (soft delete) |
| POST | `/users/:id/reset-password` | Reset mật khẩu (sinh tạm) |
| POST | `/users/:id/disable` | Disable user |
| POST | `/users/:id/enable` | Enable user |
| POST | `/users/:id/set-role` | Đổi role |
| POST | `/users/:id/disable-2fa` | Tắt 2FA cho user |

### Orphaned assets

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/orphaned-assets` | List asset không có owner |
| POST | `/orphaned-assets/reassign` | Reassign sang owner mới |
| DELETE | `/orphaned-assets` | Xoá orphaned assets |

### Audit

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/audit-logs` | Query audit log (filter user, action, date range) |

---

## 11. Phase 3 — `/v1` (review, collaboration, compliance)

Auth required (route mount tại `/v1` root, mỗi handler tự gọi `requireAuth`).

### Review system

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/reviews` | Tạo review session |
| GET | `/reviews/:draftId` | Lấy review session |
| POST | `/reviews/:draftId/comments` | Thêm comment |
| POST | `/drafts/:draftId/risk-assessment` | AI đánh giá rủi ro draft |
| POST | `/reviews/:draftId/approve` | Approve |
| POST | `/reviews/:draftId/reject` | Reject |
| GET | `/reviews/stats/:companyId` | Stats review theo công ty |

### Collaboration

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/drafts/:draftId/share` | Share draft cho user/email |
| POST | `/drafts/:draftId/revoke-access` | Revoke share |
| GET | `/drafts/:draftId/collaborators` | List collaborators |
| GET | `/drafts/:draftId/activity` | Activity log của draft |
| GET | `/shared-drafts` | Drafts được share cho user hiện tại |

### Compliance & legal hold

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/drafts/:draftId/audit-trail` | Audit trail chi tiết |
| POST | `/drafts/:draftId/sign` | Ký số draft |
| POST | `/drafts/:draftId/legal-hold` | Áp legal hold |
| GET | `/drafts/:draftId/legal-holds` | List legal hold |
| POST | `/drafts/:draftId/compliance-check` | AI compliance check |
| GET | `/drafts/:draftId/compliance` | Lấy kết quả compliance gần nhất |
| GET | `/compliance-report/:companyId` | Báo cáo compliance tổng |

---

## 12. Integration (API key) — `/v1/integration`

Auth = API key qua header (không phải JWT). Permission gating bằng `requireApiPermission('<action>')` — action lưu trong `api_keys.permissions`.

| Method | Path | Permission | Mô tả |
|--------|------|-----------|-------|
| POST | `/legal/ask` | `ask` | Hỏi đáp pháp lý qua API key |
| POST | `/contracts/:id/review` | `review` | Review hợp đồng qua API key |

Header:
```http
Authorization: Bearer <api_key>
# hoặc
X-API-Key: <api_key>
```

---

## 13. Health check — `/v1/health`

Public.

```http
GET /v1/health
```

Response 200 (ok) hoặc 503 (degraded):
```json
{
  "status": "ok",
  "message": "Backend NodeJS đã hoạt động ổn định.",
  "checks": {
    "db": { "ok": true, ... },
    "ai": { "ok": true, "provider": "azure-openai" },
    "pinecone": { "ok": true, "index": "..." }
  }
}
```

---

## 14. Static & SPA

| Path | Mô tả |
|------|-------|
| `/uploads/*` | Phục vụ file đã upload từ `server/uploads/` |
| `/` + mọi route không match `/v1` hoặc `/uploads` | Trả `client/dist/index.html` (SPA fallback) |

<!-- /AUTO-GENERATED -->

---

## 15. Lưu ý khi có breaking change

- Schema/payload thay đổi → cập nhật cả file này VÀ client `services/`.
- Permission action mới → khai báo trong `server/src/middleware/rolePermissions.js` trước khi dùng `requireAction(...)`.
- Endpoint phase mới (phase 4+) → mount trong `server/src/app.js` rồi document tại đây.

<!-- CUSTOM -->
<!-- User-written notes go here, between CUSTOM markers — sẽ không bị overwrite ở lần regenerate kế tiếp -->
<!-- /CUSTOM -->
