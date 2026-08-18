import crypto from 'node:crypto';

const REQUIRED_ENV_KEYS = ['DATABASE_URL'];

export const validateEnv = () => {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  const optionalWarnings = [];

  // JWT_SECRET KHÔNG còn nằm trong REQUIRED_ENV_KEYS: .env.example ở GỐC repo — thứ duy nhất
  // bản quét tự-cấu-hình của nền tảng đọc — trước đây không khai biến này. Ném lỗi ở đây khiến
  // deploy-từ-mẫu chết ngay tại app.js:31, trước cả khi chạm tới CSDL. Sinh khoá TẠM để app còn
  // lên được và còn xem được log.
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
    optionalWarnings.push(
      'JWT_SECRET chưa cấu hình — đã sinh khoá TẠM. Mọi phiên đăng nhập sẽ mất khi khởi động lại. Hãy đặt JWT_SECRET.'
    );
  }

  if (!process.env.AZURE_OPENAI_API_KEY) {
    optionalWarnings.push('AZURE_OPENAI_API_KEY not configured. AI features will be disabled.');
  }
  if (!process.env.AZURE_OPENAI_ENDPOINT) {
    optionalWarnings.push('AZURE_OPENAI_ENDPOINT not configured. AI features may be unavailable.');
  }
  if (!process.env.AZURE_OPENAI_API_VERSION) {
    optionalWarnings.push('AZURE_OPENAI_API_VERSION not configured. AI features may be unavailable.');
  }

  return {
    missingKeys,
    optionalWarnings,
  };
};

export const getCorsOrigins = () => {
  const origins = [];

  // Add CORS_ORIGINS from env
  if (process.env.CORS_ORIGINS) {
    const corsOrigins = process.env.CORS_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    origins.push(...corsOrigins);
  }

  // Add FRONTEND_URL if configured
  if (process.env.FRONTEND_URL && !origins.includes(process.env.FRONTEND_URL)) {
    origins.push(process.env.FRONTEND_URL);
  }

  // Default to localhost for development
  if (origins.length === 0) {
    origins.push('http://localhost:3000', 'http://localhost:5173');
  }

  return origins;
};
