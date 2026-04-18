/**
 * File Storage Configuration
 *
 * Quy tắc: chỉ cần set APP_BASE_URL trong .env khi deploy — không cần đổi code.
 *
 *   Local  :  APP_BASE_URL=http://localhost:8080
 *   Product:  APP_BASE_URL=https://tenmien.com
 *
 * Files được lưu tại UPLOAD_DIR (mặc định: server/uploads/).
 * Express phục vụ chúng qua route /uploads/* (static middleware).
 *
 * Workflow git:
 *   git push → git pull → npm start   ← KHÔNG cần sửa gì
 *   Files upload KHÔNG commit vào git (xem .gitignore).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import multer from 'multer';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '../../');

// ─── Paths ────────────────────────────────────────────────────────────────────

/**
 * Thư mục gốc lưu file upload.
 * Override bằng UPLOAD_DIR trong .env nếu cần mount volume riêng.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(SERVER_ROOT, 'uploads');

/**
 * Base URL của ứng dụng — dùng để tạo URL công khai cho file.
 * KHÔNG có dấu / ở cuối.
 */
export const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

/**
 * Chuyển đường dẫn tương đối (từ DB) thành URL công khai.
 * @param {string|null} relativePath - vd: "contracts/abc123/2026-04/uuid.pdf" hoặc "uploads/contracts/..."
 * @returns {string|null}
 */
export const getFileUrl = (relativePath) => {
  if (!relativePath) return null;
  // Chuẩn hoá dấu \ thành / cho Windows dev environment
  let normalized = relativePath.replace(/\\/g, '/');
  
  // Nếu path đã bao gồm /uploads/ hoặc uploads/, bỏ đi để tránh double
  if (normalized.startsWith('uploads/')) {
    normalized = normalized.substring(8); // loại bỏ "uploads/"
  } else if (normalized.startsWith('/uploads/')) {
    normalized = normalized.substring(9); // loại bỏ "/uploads/"
  }
  
  return `${APP_BASE_URL}/uploads/${normalized}`;
};

/**
 * Lấy đường dẫn tuyệt đối trên disk từ relative path.
 */
export const getAbsolutePath = (relativePath) =>
  path.join(UPLOAD_DIR, relativePath);

// ─── Multer disk storage factory ─────────────────────────────────────────────

/**
 * Tạo multer instance với diskStorage cho từng loại resource.
 * @param {'contracts'|'documents'|'templates'} resourceType
 */
export const createDiskUpload = (resourceType, { fileSizeMB = 20, allowedExts = null } = {}) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Tổ chức theo: uploads/{resourceType}/{company_id}/{yyyy-mm}/
      const companyId = req.resolvedCompanyId || req.user?.companyId || 'shared';
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const dest = path.join(UPLOAD_DIR, resourceType, companyId, yearMonth);

      try {
        mkdirSync(dest, { recursive: true });
        cb(null, dest);
      } catch (err) {
        cb(err);
      }
    },

    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      // UUID để tránh trùng tên & path traversal
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: allowedExts
      ? (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase().slice(1);
          cb(null, allowedExts.includes(ext));
        }
      : undefined,
  });
};

/**
 * Tính đường dẫn tương đối để lưu vào DB.
 * @param {string} absolutePath - đường dẫn tuyệt đối từ multer
 * @returns {string} relative path (dùng forward slash)
 */
export const toRelativePath = (absolutePath) =>
  path.relative(UPLOAD_DIR, absolutePath).replace(/\\/g, '/');

// Đảm bảo các thư mục cơ bản tồn tại khi server khởi động
['contracts', 'documents', 'templates'].forEach((sub) => {
  mkdirSync(path.join(UPLOAD_DIR, sub), { recursive: true });
});
