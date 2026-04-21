# Bo tai lieu ky thuat - Legal AI Platform

## 1. Tong quan he thong
Ung dung la nen tang ho tro nghiep vu phap ly cho doanh nghiep, gom 2 khoi chinh:
- Frontend: React + Vite, giao dien quan ly hop dong, tai lieu, template, tra cuu phap ly.
- Backend: Express + Prisma + PostgreSQL, cung cap API REST, xu ly xac thuc, phan quyen, nghiep vu va tich hop AI.

Muc tieu he thong:
- Tap trung du lieu phap ly (hop dong, tai lieu, template).
- Tu dong hoa tra cuu, review, danh gia rui ro bang AI.
- Dam bao da tenant (company), audit va phan quyen theo vai tro.

## 2. Kien truc ma nguon

### 2.1 Frontend (thu muc client)
Cac file/truc chinh:
- client/src/App.jsx: shell route chinh, dashboard, auth flow, dieu huong page.
- client/src/main.jsx: diem vao ung dung.
- client/src/store/index.js: cau hinh Redux Toolkit store.
- client/src/store/slices/authSlice.js: state dang nhap, user, token.
- client/src/store/slices/draftSlice.js: state ban thao.
- client/src/store/slices/uiSlice.js: state UI (tab, sidebar, thong bao).
- client/src/services/apiClient.js: axios client, interceptor, co che token refresh/retry.
- client/src/services/authService.js: login/register/logout/validate token.
- client/src/utils/tokenUtils.js: luu, doc, validate access/refresh token.
- client/src/utils/fetchWithAuth.js: helper goi API kem token.
- client/src/pages/*: man hinh chuc nang (Contracts, Documents, Templates, Legal Search, Admin, User Profile).
- client/src/components/phase4/*: bo component dashboard phase 4 (review, collaboration, compliance, search analytics, template hub, notifications).

### 2.2 Backend (thu muc server)
Cac file/truc chinh:
- server/src/app.js: tao Express app, middleware, route mounting, healthcheck, SPA fallback.
- server/index.js: khoi dong HTTP server.
- server/src/config/env.js: doc va validate bien moi truong.
- server/src/config/storage.js: cau hinh thu muc upload.
- server/src/middleware/auth.js: xac thuc JWT.
- server/src/middleware/requireRole.js, rolePermissions.js: phan quyen theo role va action.
- server/src/routes/*.js: dinh nghia endpoint theo module nghiep vu.
- server/src/services/*.js: business logic, tich hop AI, contracts, templates, token, compliance, collaboration...
- server/src/lib/prisma.js: ket noi va healthcheck DB.
- server/src/lib/bootstrap.js: dam bao bang MVP ton tai khi boot.
- server/prisma/schema.prisma + database/*.sql: mo hinh du lieu va migration.

## 3. Co che hoat dong

### 3.1 Auth va session
- Nguoi dung dang nhap qua /v1/auth/login.
- Backend cap access token + refresh token.
- Frontend luu token qua tokenUtils + Redux.
- Khi access token sap het han, client goi refresh de lay token moi.
- Logout se huy session token tren server va xoa token local.

### 3.2 Da tenant va phan quyen
- Moi user thuoc mot company.
- Middleware requireAuth + requireActive() bat buoc tren da so route.
- Middleware requireAction(...) kiem soat quyen theo thao tac (upload, review, manage api keys...).
- Role chinh: owner/admin/member/viewer + superadmin.

### 3.3 Du lieu va audit
- PostgreSQL la nguon du lieu chinh.
- Bang chinh: companies, users, api_keys, contracts, documents, drafts, reviews, audit_logs...
- Ho tro vector qua extension vector cho truong hop retrieval/embedding.
- Audit log ghi nhan hanh dong nghiep vu.

### 3.4 AI flow
Luong tong quat:
1. User gui yeu cau (tra cuu phap ly hoac review hop dong).
2. Backend xac thuc + phan quyen.
3. Service nghiep vu lay context (du lieu noi bo, retrieval, template).
4. Goi AI provider (Azure OpenAI) va/hoac Pinecone retrieval.
5. Chuan hoa ket qua thanh JSON cho frontend.
6. Luu vết su dung/phan tich vao DB neu can.

## 4. Danh sach route va tinh nang

### 4.1 Route xac thuc
- /v1/auth/register
- /v1/auth/login
- /v1/auth/setup-2fa
- /v1/auth/verify-2fa-setup
- /v1/auth/verify-otp
- /v1/auth/refresh
- /v1/auth/logout

### 4.2 Route nghiep vu chinh
- /v1/contracts: upload, parse metadata, cap nhat, review rui ro.
- /v1/documents: upload, cap nhat, analyze.
- /v1/drafts: tao, sua, validate, doi trang thai, export.
- /v1/templates: CRUD template, generate, export.
- /v1/legal/ask: hoi dap phap ly co phan quyen.
- /v1/categories, /v1/tags: danh muc va nhan.
- /v1/settings/api-keys: quan ly API key.
- /v1/profile: cap nhat thong tin ca nhan, doi mat khau, 2FA.
- /v1/admin: quan tri user, role, orphaned assets.
- /v1 (phase3): review, comments, approve/reject, share/revoke, sign, legal hold, compliance check.
- /v1/integration/*: endpoint tich hop qua API key.
- /v1/health: kiem tra trang thai DB/AI/Pinecone.

## 5. Luong nghiep vu tieu bieu

### 5.1 Luong upload va review hop dong
1. User vao trang Contracts.
2. Upload file qua /v1/contracts/upload.
3. He thong trich xuat text va luu metadata.
4. User bam review => /v1/contracts/:id/review.
5. Backend tra ket qua danh gia rui ro, canh bao dieu khoan.

### 5.2 Luong tao van ban tu template
1. User vao Templates.
2. Chon template va nhap bien so.
3. Goi /v1/templates/:templateId/generate.
4. Xuat ket qua va export qua /v1/templates/:templateId/export hoac luu draft.

### 5.3 Luong duyet draft
1. Tao draft moi qua /v1/drafts.
2. Chinh sua va validate noi dung /v1/drafts/:draftId/validate.
3. Chuyen trang thai (draft -> review -> approved) qua /v1/drafts/:draftId/status.
4. Phe duyet/tu choi qua route phase3.

## 6. Cau hinh va van hanh

### 6.1 Bien moi truong can thiet (tom tat)
- DATABASE_URL
- JWT_SECRET
- FRONTEND_URL
- VITE_API_URL (frontend)
- AZURE_OPENAI_* keys
- PINECONE_API_KEY

### 6.2 Chay local
Backend:
- cd server
- npm install
- npx prisma generate
- npm start

Frontend:
- cd client
- npm install
- npm run dev

Test:
- server: npm test
- client: npm test

### 6.3 Production
- Build frontend: npm run build (tai client).
- Backend phuc vu static tu client/dist qua express.static.
- SPA fallback trong app.js dam bao route client hoat dong khi refresh truc tiep.
- CORS lay origin tu env, bat credentials.

## 7. Bao mat, do tin cay va gioi han

### 7.1 Bao mat
- JWT + refresh token.
- Mat khau hash bang bcrypt.
- Middleware phan quyen theo action.
- API key cho integration endpoint.
- Co 2FA o auth/profile routes.

### 7.2 Do tin cay
- Healthcheck /v1/health.
- Error handling middleware toan cuc.
- Logging va theo doi hieu nang tren client (loggingService/performanceMonitor).

### 7.3 Gioi han hien tai
- Can tiep tuc tinh chinh chat luong export (PDF/DOCX) theo tung truong hop nghiep vu.
- Can quy hoach tiep bo test regression end-to-end cho cac flow lon.

## 8. Cau truc docs moi
Tai lieu duoc rut gon con 2 bo:
- TECHNICAL_DOCUMENTATION.md (tai lieu nay): danh cho dev, QA, DevOps, BA ky thuat.
- USER_GUIDE.md: danh cho nguoi dung cuoi.

Dat muc tieu: de bao tri, khong trung lap, de onboard thanh vien moi va de doi soat khi release.