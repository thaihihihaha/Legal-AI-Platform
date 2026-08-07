# PRD — Legal AI Platform

> **Trạng thái**: SKELETON — vibe-docs auto-generated từ code state. Cần BA/Product fine-tune lại sections đánh dấu `[ ]`.

## 1. Tóm tắt sản phẩm

**Tên**: Legal AI Platform (`tool-legal`)
**Mục tiêu**: Nền tảng SaaS multi-tenant hỗ trợ doanh nghiệp số hoá nghiệp vụ pháp lý — quản lý hợp đồng/tài liệu, tra cứu pháp lý bằng AI có dẫn chiếu, soạn thảo theo template, review rủi ro tự động, phê duyệt nội bộ + ký số + compliance check.

## 2. Vấn đề giải quyết

- Doanh nghiệp Việt Nam quản lý hợp đồng phân tán (file local, email, drive) → khó tra cứu, dễ thất thoát.
- Review hợp đồng thủ công tốn thời gian phòng pháp chế; rủi ro bỏ sót điều khoản bất lợi.
- Tra cứu luật bằng Google → kết quả không có dẫn chiếu chính thống, dễ trích sai.
- Soạn thảo lặp lại từ template Word → lỗi copy-paste, không phiên bản hoá.

## 3. User persona

| Persona | Vai trò | Use case chính |
|---------|---------|----------------|
| Trưởng phòng Pháp chế | Owner/Admin | Cấu hình tenant, quản lý user, review rủi ro hợp đồng quan trọng, duyệt draft |
| Chuyên viên Pháp chế | Member | Upload hợp đồng, review rủi ro, soạn draft từ template, tra cứu pháp lý |
| Chuyên viên Nhân sự / Vận hành | Member | Soạn hợp đồng lao động/dịch vụ từ template, gửi duyệt |
| Lãnh đạo (CEO/Giám đốc) | Viewer | Xem dashboard rủi ro tổng hợp, theo dõi compliance |
| Dev tích hợp | API consumer | Gọi `/v1/integration/*` bằng API key cho hệ thống bên thứ ba |

## 4. Tính năng cốt lõi (đã implement)

Tham chiếu `docs/API.md` + `docs/ARCH.md`.

- [x] **Auth + multi-tenant**: JWT + refresh token + 2FA TOTP, scoped theo `company_id`.
- [x] **Quản lý hợp đồng**: upload, parse metadata, list/filter, review rủi ro bằng AI, risk summary.
- [x] **Quản lý tài liệu**: upload, download, analyze AI.
- [x] **Soạn thảo (Draft)**: tạo, sửa, validate, version, export PDF/DOCX, chuyển trạng thái.
- [x] **Template**: CRUD, generate document từ variables, export.
- [x] **Tra cứu pháp lý AI**: `/v1/legal/ask` — retrieval qua Pinecone + Azure OpenAI có citation.
- [x] **Phân loại**: categories + tags theo resource type.
- [x] **Phase 3** (review/collaboration/compliance):
  - Review session + comment + approve/reject
  - Share draft + revoke access + activity log
  - Digital signature, legal hold, compliance check, audit trail
- [x] **Admin**: quản lý user, reset password, role assignment, orphaned assets cleanup, audit log query.
- [x] **API integration**: API key + permission, rate limit per key.
- [x] **Settings**: quota & usage tracking per company.

## 5. Tính năng đang/sẽ phát triển

- [ ] _(BA điền)_ Phase 4: dashboard analytics nâng cao, search analytics, template hub.
- [ ] _(BA điền)_ Webhook delivery cho integration.
- [ ] _(BA điền)_ Reminder & notification queue tự động.

## 6. Non-functional requirements

| NFR | Hiện trạng |
|-----|------------|
| **Bảo mật** | JWT + bcrypt + helmet + rate-limit + 2FA TOTP + API key + audit log. CSP delegate sang reverse proxy. |
| **Multi-tenant isolation** | Mọi query lọc theo `company_id`. Cần audit thêm để đảm bảo không leak cross-tenant. |
| **Performance** | Body limit 1MB. Chưa có benchmark target chính thức. |
| **Reliability** | Healthcheck `/v1/health` (DB + AI + Pinecone). Chưa có HA/cluster setup. |
| **Compliance** | Có module compliance check + legal hold + audit trail (phase 3). |
| **Observability** | Console log + audit log DB. Chưa có APM/tracing. |

## 7. Success metrics

- [ ] _(Product điền)_ MAU phòng Pháp chế / công ty.
- [ ] _(Product điền)_ Số hợp đồng review/tháng.
- [ ] _(Product điền)_ Số draft generate từ template / tháng.
- [ ] _(Product điền)_ Số query legal AI / tháng.
- [ ] _(Product điền)_ Conversion từ trial → starter/pro/enterprise.

## 8. Out of scope

- [ ] _(Product xác nhận)_ Mobile native app.
- [ ] _(Product xác nhận)_ E-signature qua bên thứ ba (DocuSign/USB token PKI).
- [ ] _(Product xác nhận)_ OCR ảnh chụp hợp đồng giấy.

## 9. Stakeholders

- **Team**: Mắt Bão UI/UX (`ts`)
- **Product owner**: _(điền)_
- **Tech lead**: _(điền)_
- **BA**: _(điền)_

## 10. Tham chiếu

- Tech doc: `docs/TECHNICAL_DOCUMENTATION.md`
- User guide: `docs/USER_GUIDE.md`
- Architecture: `docs/ARCH.md`
- API: `docs/API.md`
- Deploy script: `docs/PLESK_DEPLOY.sh`
