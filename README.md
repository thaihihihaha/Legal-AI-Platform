# ⚖️ Trợ lý Pháp lý AI (Node.js/React Edition)

## Status (April 16, 2026)

MVP hiện tại đã chạy end-to-end theo các phase triển khai gần nhất:

- Auth JWT: register/login + protected routes
- Legal Ask: API bảo vệ bằng token, truy xuất nguồn luật trước khi trả structured output (`answer`, `citations`, `confidence`, `usage`)
- Contracts: upload/list/review có persistence DB
- Frontend: route shell đầy đủ (`/login`, `/register`, `/dashboard`, `/contracts`, `/legal-search`, `/settings`)
- Test: có integration tests route-level trong `server/test/api.integration.test.js`

Đây là bản tái cấu trúc hoàn toàn hệ thống Trợ lý Pháp lý AI (bản quyền gốc từ Python/FastAPI) sang **hệ sinh thái Node.js hiện đại**. Mọi luồng tính năng và chức năng của AI đều được giữ nguyên ở mức độ ưu việt, cộng kèm với việc chia tách mạch lạc Frontend/Backend theo quy chuẩn hệ thống phần mềm doanh nghiệp.

## ✨ Các Tính Năng Hiện Có (Phase 2 Completed)

1. **Giao Diện Frontend Tuyệt Đỉnh (React + Vanilla CSS):**
   - Kiến trúc Giao diện mô phỏng 3 Tab chia khu vực của VSCode (Sidebar, Terminal, Main View).
   - Module **Kho Hợp Đồng & Upload DOCX/PDF** (Tự động bóc tách chữ qua File đính kèm để gửi AI rà soát rủi ro).
   - View **Dashboard** tổng quan rủi ro pháp lý toàn doanh nghiệp.
   - Component **Chat AI** hiển thị realtime câu trả lời từ máy chủ theo từng ô bubble.
   - Toàn bộ đều tuân thủ nguyên tắc cấm dùng `alert/prompt` gốc của Trình duyệt và thay bằng Cửa sổ Modal Custom.

2. **Khối Lõi Backend (Express.js):**
   - Giao tiếp Database PostgreSql/MariaDB qua chuẩn Prisma ORM (`schema.prisma`).
   - Tái tạo hệ thống Xác thực Đăng nhập & Đăng ký qua thẻ mã hóa JWT + Bcrypt.
   - Kiến trúc tích hợp Database kép lai (Hybrid): Dùng Postgres làm trung tâm + Pinecone Vector Database chuyên lưu trữ não bộ NLP.

3. **Luồng Cốt Lõi AI (Azure OpenAI + Legal Retrieval):**
   - Bộ API `/v1/legal/ask`: Trả lời dựa trên bối cảnh luật đã truy xuất, không suy diễn ngoài nguồn.
   - Bộ API `/v1/contracts/:id/review`: Tìm kiếm điểm rủi ro và khuyến nghị ngay lập tức với file Hợp đồng gửi lên.

## 🚀 Hướng Dẫn Cài Đặt (Quick Start)

### 1. Di chuyển vào Trụ Sở Dự Án Mới
```bash
cd d:/Project/longpl
```

### 2. Thiết lập Môi trường
Bắt buộc sao chép file `.env.example` thành `.env` để nhúng các Khoá bảo mật và Cấu hình CSDL:
```bash
copy server\.env.example server\.env
```

*Trong file `.env`, bạn cần điền `DATABASE_URL`, `JWT_SECRET`, Azure OpenAI keys và `PINECONE_API_KEY`.*

### 3. Cài các gói dữ liệu Backend
```bash
cd server
npm install
npx prisma generate
```

### 4. Bật động cơ (Backend)
```bash
npm start
```

### 5. Khởi chạy Giao diện Người dùng (Frontend)
(Mở 1 Terminal khác:)
```bash
cd client
npm install
npm run dev
```

Truy cập `http://localhost:5173/` để làm việc với AI trực tiếp.

## ✅ Chạy Test

```bash
cd server
npm test
```

Integration test hiện bao phủ auth, route protection, upload/list contracts, và payload validation.

## 📡 API MVP hiện tại

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/health`
- `POST /v1/legal/ask` (protected)
- `GET /v1/contracts` (protected)
- `POST /v1/contracts/upload` (protected)
- `POST /v1/contracts/:id/review` (protected)
