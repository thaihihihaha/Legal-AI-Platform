# Legal AI Platform (tool-legal)

Nền tảng hỗ trợ nghiệp vụ pháp lý cho doanh nghiệp: quản lý hợp đồng, tài liệu, template; tra cứu pháp lý + review rủi ro bằng AI; phê duyệt — ký số — compliance check theo từng tenant (công ty).

Domain production: `https://legalmb.cloud`

---

## 1. Tech stack

<!-- AUTO-GENERATED: do not edit -->

**Frontend (`client/`)**
- React 19 + Vite 8 + React Router 7
- Redux Toolkit + React-Redux
- TipTap editor (extension-text-align, character-count, underline, starter-kit)
- Axios (có interceptor refresh token)
- Vitest + Testing Library

**Backend (`server/`)**
- Node 22 + Express 5 (ESM, `"type": "module"`)
- Prisma 5 + PostgreSQL (kèm extension `vector` cho retrieval)
- Auth: JWT (access + refresh) + bcrypt + speakeasy (TOTP 2FA) + qrcode
- Bảo mật: helmet, express-rate-limit, CORS có whitelist
- AI: OpenAI SDK (Azure OpenAI) + Pinecone (`@pinecone-database/pinecone`)
- File parsing: `pdf-parse`, `mammoth` (docx), `pdfkit`, `docx` (export)
- Upload: `multer`

**Database (`database/`, `migrations/`, `server/prisma/`)**
- PostgreSQL với 49 model Prisma — tham chiếu `server/prisma/schema.prisma`
- File SQL migration phase-based: `database/migration_phase3_*.sql`, `migration_agentic_tools.sql`, `migration_llm_providers.sql`, `migration_platform_admin.sql`

<!-- /AUTO-GENERATED -->

---

## 2. Yêu cầu môi trường

- Node.js >= 22.x
- PostgreSQL >= 14 (cần extension `vector` cho retrieval/embedding)
- Tài khoản Azure OpenAI (optional — tắt nếu không cấu hình)
- Tài khoản Pinecone (optional)

---

## 3. Setup local

### 3.1 Cài đặt

```bash
# Server
cd server
npm install
npx prisma generate

# Client
cd ../client
npm install
```

### 3.2 Biến môi trường

Tạo `server/.env`:

```bash
# Bắt buộc
DATABASE_URL=postgresql://user:pass@localhost:5432/legal_ai
JWT_SECRET=<random-256-bit>

# Tuỳ chọn
APP_PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# AI providers (tuỳ chọn — tắt feature nếu thiếu)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
PINECONE_API_KEY=
```

Tạo `client/.env`:

```bash
VITE_API_URL=http://localhost:8080
```

### 3.3 Init database

```bash
# Apply Prisma schema
cd server
npx prisma migrate deploy        # hoặc: npx prisma db push (dev)

# Hoặc chạy SQL trực tiếp
psql $DATABASE_URL -f ../database/init.sql
psql $DATABASE_URL -f ../database/migration_phase3_review_system.sql
# ... các migration phase3 + platform_admin theo thứ tự
```

### 3.4 Chạy dev

```bash
# Terminal 1 — backend (port 8080)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Truy cập http://localhost:5173.

### 3.5 Test

```bash
cd server && npm test        # node --test
cd client && npm test        # vitest
```

---

## 4. Build production

```bash
# Build frontend → client/dist
cd client && npm run build

# Backend phục vụ static từ client/dist (xem app.js)
cd ../server && npm start
```

Server tự `express.static(client/dist)` + SPA fallback route → React Router xử lý client routing khi refresh trực tiếp.

---

## 5. Deploy

Hiện tại deploy lên **Plesk** (legalmb.cloud) — xem `docs/PLESK_DEPLOY.sh` cho script + checklist Plesk.

Tóm tắt:
1. `bash docs/PLESK_DEPLOY.sh` để build local
2. Upload `server/` + `client/dist/` lên Plesk Node.js app
3. Cấu hình env vars trong Plesk panel (DATABASE_URL, JWT_SECRET, FRONTEND_URL, CORS_ORIGINS, ...)
4. Startup file: `index.js`, Application Root: `server`
5. Verify: `curl https://legalmb.cloud/v1/health`

> **Lưu ý**: Project này KHÔNG dùng Coolify/Docker compose như template chuẩn Mắt Bão — deploy custom qua Plesk. Nếu muốn migrate sang Coolify, tham khảo skill `deploy` (cần Dockerfile multi-stage).

---

## 6. Cấu trúc thư mục

```
tool-legal/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Admin, Contracts, Documents, Templates, LegalSearch, UserProfile
│   │   ├── components/  # Modal, DraftEditor, phase4/, ui/, workspace/
│   │   ├── store/       # Redux Toolkit slices
│   │   ├── services/    # apiClient, authService
│   │   └── utils/       # tokenUtils, fetchWithAuth
│   └── dist/            # Build output (gitignored)
├── server/              # Express + Prisma backend
│   ├── src/
│   │   ├── app.js       # Express app + route mounting + SPA fallback
│   │   ├── routes/      # 12 route modules (auth, contracts, documents, ...)
│   │   ├── services/    # Business logic + AI integration
│   │   ├── middleware/  # auth, requireRole, requireAction
│   │   ├── agents/      # legal_agent.js (Azure OpenAI)
│   │   ├── lib/         # prisma client, bootstrap
│   │   └── config/      # env validation, storage paths
│   ├── prisma/          # schema.prisma (49 models)
│   └── uploads/         # Upload runtime dir (gitignored)
├── database/            # SQL init + phase migrations
├── migrations/          # Admin features SQL
├── scripts/             # Crawl/embed laws, fix scripts
├── data/                # Sample seed JSON
└── docs/
    ├── README.md         (file này)
    ├── TECHNICAL_DOCUMENTATION.md
    ├── USER_GUIDE.md
    ├── ARCH.md
    ├── API.md
    └── PRD.md
```

---

## 7. Tài liệu liên quan

- `docs/PRD.md` — mục tiêu sản phẩm, user persona, success metrics
- `docs/ARCH.md` — kiến trúc hệ thống, data flow, component diagram
- `docs/API.md` — danh sách endpoint REST + auth/permission
- `docs/TECHNICAL_DOCUMENTATION.md` — chi tiết kỹ thuật cho dev/QA/DevOps
- `docs/USER_GUIDE.md` — hướng dẫn người dùng cuối (phòng Pháp chế)
- `docs/PLESK_DEPLOY.sh` — deploy script + checklist Plesk

---

## 8. Liên hệ

Team: Mắt Bão UI/UX (`ts`) — quản lý qua workspace Coder.
Báo lỗi/đề xuất: dùng kênh nội bộ team.
