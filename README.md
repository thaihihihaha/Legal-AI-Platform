# Legal AI Platform (tool-legal)

Nền tảng số hóa nghiệp vụ pháp lý cho doanh nghiệp: quản lý hợp đồng và tài liệu tập trung, tra cứu pháp luật bằng AI có dẫn chiếu nguồn, soạn thảo văn bản theo mẫu, tự động rà soát rủi ro, phê duyệt nội bộ — ký số — kiểm tra tuân thủ (compliance), vận hành theo mô hình đa công ty (multi-tenant).

---

## 1. Giới thiệu chức năng

### 1.1 Quản lý hợp đồng
Tập trung toàn bộ hợp đồng của công ty vào một nơi duy nhất thay vì rải rác trên email, ổ đĩa cá nhân, Zalo/Drive. Người dùng tải hợp đồng lên (PDF/DOCX), hệ thống tự trích metadata (loại hợp đồng, đối tác, ngày ký...), cho phép tìm kiếm/lọc nhanh và gắn nhãn phân loại. Khi cần đối chiếu hoặc kiểm toán, không còn tình trạng "hợp đồng nằm ở máy ai đó".

**Lợi ích nghiệp vụ:** giảm thời gian tìm kiếm hợp đồng từ hàng chục phút xuống vài giây; tránh thất lạc hợp đồng khi nhân sự nghỉ việc/luân chuyển.

### 1.2 Rà soát rủi ro hợp đồng bằng AI
Sau khi upload, người dùng bấm "Review" — AI đọc toàn bộ nội dung hợp đồng, chỉ ra các điều khoản bất lợi, thiếu sót, mơ hồ hoặc rủi ro pháp lý tiềm ẩn, kèm điểm rủi ro tổng thể (risk score) và khuyến nghị điều chỉnh cụ thể.

**Lợi ích nghiệp vụ:** phòng pháp chế không phải đọc thủ công từng điều khoản trong hợp đồng dài hàng chục trang; giảm nguy cơ bỏ sót điều khoản gây thiệt hại cho công ty; rút ngắn thời gian review từ hàng giờ xuống vài phút.

### 1.3 Quản lý tài liệu nội bộ
Ngoài hợp đồng, hệ thống lưu trữ và quản lý các tài liệu pháp lý/nội bộ khác (quy chế, chính sách, văn bản pháp luật tham chiếu...), hỗ trợ tải lên, tải xuống và phân tích nội dung bằng AI khi cần.

### 1.4 Soạn thảo văn bản từ mẫu (Template)
Xây dựng sẵn thư viện mẫu văn bản (hợp đồng lao động, hợp đồng dịch vụ, biên bản, quyết định...). Người dùng chỉ cần điền các trường thông tin (tên bên A/B, ngày tháng, giá trị hợp đồng...), hệ thống tự sinh văn bản hoàn chỉnh và cho phép xuất ra PDF hoặc DOCX.

**Lợi ích nghiệp vụ:** loại bỏ thao tác copy-paste từ file Word cũ dễ gây lỗi (sai tên đối tác, sai điều khoản do quên sửa); chuẩn hóa văn bản theo đúng mẫu công ty; nhân sự không rành pháp lý vẫn tạo được văn bản đúng chuẩn.

### 1.5 Soạn thảo (Draft) và quy trình phê duyệt
Tạo bản nháp văn bản, chỉnh sửa, kiểm tra hợp lệ (validate), lưu lịch sử phiên bản, sau đó chuyển sang trạng thái "chờ duyệt" để người có thẩm quyền phê duyệt hoặc từ chối kèm nhận xét — có ghi log toàn bộ quá trình trao đổi/duyệt.

**Lợi ích nghiệp vụ:** minh bạch hóa quy trình duyệt văn bản, biết rõ ai duyệt/từ chối/khi nào; tránh tình trạng phê duyệt qua email rời rạc, khó truy vết sau này.

### 1.6 Tra cứu pháp luật bằng AI (có dẫn chiếu nguồn)
Người dùng đặt câu hỏi pháp lý bằng ngôn ngữ tự nhiên (ví dụ: "Thời gian thử việc tối đa theo luật lao động hiện hành là bao lâu?"). Hệ thống tìm kiếm trong kho văn bản pháp luật đã được nạp sẵn (retrieval), trả lời kèm trích dẫn điều luật/nguồn cụ thể — không trả lời chung chung như tra Google.

**Lợi ích nghiệp vụ:** giảm rủi ro trích dẫn sai luật do tra cứu thủ công; tiết kiệm thời gian tra văn bản pháp luật; có nguồn dẫn chiếu rõ ràng để đối chiếu lại khi cần.

### 1.7 Chia sẻ, chữ ký số và kiểm tra tuân thủ
Chia sẻ bản nháp/hợp đồng cho người liên quan (có thể thu hồi quyền truy cập bất kỳ lúc nào), ký số văn bản, thực hiện "legal hold" (giữ tài liệu phục vụ tranh chấp/kiểm toán), kiểm tra tuân thủ theo quy định nội bộ, và lưu vết toàn bộ hoạt động (audit trail) phục vụ thanh tra/kiểm toán sau này.

### 1.8 Quản trị hệ thống
Quản trị viên quản lý người dùng, phân quyền theo vai trò, reset mật khẩu, dọn dữ liệu mồ côi (orphaned assets), tra cứu nhật ký hoạt động toàn hệ thống.

### 1.9 Tích hợp qua API
Cho phép hệ thống bên thứ ba (ví dụ hệ thống HR, ERP nội bộ) gọi vào nền tảng qua API key riêng, có giới hạn tần suất gọi (rate limit) và phân quyền theo từng key — phục vụ tự động hóa quy trình giữa các hệ thống.

### 1.10 Bảo mật tài khoản
Đăng nhập bằng JWT (access + refresh token), hỗ trợ xác thực 2 lớp (2FA) bằng mã OTP từ ứng dụng xác thực (Google Authenticator, Authy...), mật khẩu mã hóa bcrypt, giới hạn số lần gọi API để chống tấn công dò mật khẩu/brute-force.

### 1.11 Vận hành đa công ty (Multi-tenant)
Một hệ thống có thể phục vụ nhiều công ty độc lập, dữ liệu được cô lập hoàn toàn theo từng công ty (`company_id`) — công ty A không thể nhìn thấy dữ liệu công ty B.

---

## 2. Đối tượng sử dụng

| Vai trò | Việc chính thực hiện trên hệ thống |
|---|---|
| Trưởng phòng Pháp chế (Admin) | Cấu hình công ty, quản lý người dùng, review hợp đồng quan trọng, duyệt bản nháp |
| Chuyên viên Pháp chế | Upload hợp đồng, review rủi ro, soạn draft từ mẫu, tra cứu pháp lý |
| Nhân sự / Vận hành | Soạn hợp đồng lao động, hợp đồng dịch vụ từ mẫu có sẵn, gửi duyệt |
| Ban lãnh đạo | Xem tổng quan rủi ro, theo dõi tình trạng tuân thủ |
| Đội kỹ thuật tích hợp | Gọi API bằng API key để kết nối hệ thống nội bộ khác |

---

## 3. Công nghệ sử dụng

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

## 4. Yêu cầu môi trường

- Node.js >= 22.x
- PostgreSQL >= 14 (cần extension `vector` cho retrieval/embedding)
- Tài khoản Azure OpenAI (tùy chọn — tắt tính năng AI nếu không cấu hình)
- Tài khoản Pinecone (tùy chọn)

---

## 5. Cài đặt và chạy thử (local)

### 5.1 Cài đặt

```bash
# Server
cd server
npm install
npx prisma generate

# Client
cd ../client
npm install
```

### 5.2 Biến môi trường

Tạo `server/.env`:

```bash
# Bắt buộc
DATABASE_URL=postgresql://user:pass@localhost:5432/legal_ai
JWT_SECRET=<chuoi-ngau-nhien-256-bit>

# Tuỳ chọn
APP_PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# AI providers (tuỳ chọn — tắt tính năng AI nếu thiếu)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
PINECONE_API_KEY=
```

Tạo `client/.env`:

```bash
VITE_API_URL=http://localhost:8080
```

### 5.3 Khởi tạo database

```bash
# Áp dụng Prisma schema
cd server
npx prisma migrate deploy        # hoặc: npx prisma db push (dev)

# Hoặc chạy SQL trực tiếp
psql $DATABASE_URL -f ../database/init.sql
psql $DATABASE_URL -f ../database/migration_phase3_review_system.sql
# ... các migration phase3 + platform_admin theo thứ tự
```

### 5.4 Chạy môi trường phát triển

```bash
# Terminal 1 — backend (port 8080)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Truy cập http://localhost:5173.

### 5.5 Chạy kiểm thử (test)

```bash
cd server && npm test        # node --test
cd client && npm test        # vitest
```

---

## 6. Build bản production

```bash
# Build frontend → client/dist
cd client && npm run build

# Backend phục vụ static từ client/dist (xem app.js)
cd ../server && npm start
```

Server tự `express.static(client/dist)` + SPA fallback route → React Router xử lý client routing khi refresh trực tiếp.

---

## 7. Triển khai (Deploy)

Hiện tại triển khai lên **Plesk** — xem `docs/PLESK_DEPLOY.sh` cho script và checklist chi tiết.

Tóm tắt:
1. `bash docs/PLESK_DEPLOY.sh` để build local
2. Upload `server/` + `client/dist/` lên Plesk Node.js app
3. Cấu hình biến môi trường trong Plesk panel (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, ...) theo tên miền thực tế của môi trường triển khai
4. Startup file: `index.js`, Application Root: `server`
5. Kiểm tra hoạt động qua endpoint `/v1/health`

> **Lưu ý**: Project này KHÔNG dùng Coolify/Docker compose như template chuẩn Mắt Bão — triển khai tùy biến qua Plesk. Nếu muốn migrate sang Coolify, tham khảo skill `deploy` (cần Dockerfile multi-stage).

---

## 8. Cấu trúc thư mục

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

## 9. Tài liệu liên quan

- `docs/PRD.md` — mục tiêu sản phẩm, user persona, success metrics
- `docs/ARCH.md` — kiến trúc hệ thống, data flow, component diagram
- `docs/API.md` — danh sách endpoint REST + auth/permission
- `docs/TECHNICAL_DOCUMENTATION.md` — chi tiết kỹ thuật cho dev/QA/DevOps
- `docs/USER_GUIDE.md` — hướng dẫn người dùng cuối (phòng Pháp chế)
- `docs/PLESK_DEPLOY.sh` — deploy script + checklist Plesk

---

## 10. Liên hệ

Team: Mắt Bão UI/UX (`ts`) — quản lý qua workspace Coder.
Báo lỗi/đề xuất: dùng kênh nội bộ team.
