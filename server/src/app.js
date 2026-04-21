import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contracts.js';
import documentRoutes from './routes/documents.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import legalRoutes from './routes/legal.js';
import settingsRoutes from './routes/settings.js';
import integrationRoutes from './routes/integration.js';
import templateRoutes from './routes/templates.js';
import draftsRoutes from './routes/drafts.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profile.js';
import phase3Routes from './routes/phase3.js';
import { initAI, getAIStatus } from './agents/legal_agent.js';
import { initPinecone, getPineconeStatus } from './services/pinecone.js';
import { validateEnv, getCorsOrigins } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { requireSuperAdmin, requireActive } from './middleware/requireRole.js';
import { getPrismaHealth } from './lib/prisma.js';
import { ensureMvpTables } from './lib/bootstrap.js';
import { UPLOAD_DIR } from './config/storage.js';

dotenv.config();

const envCheck = validateEnv();
envCheck.optionalWarnings.forEach((warning) => console.warn(`⚠️ ${warning}`));

// Khởi động Trí tuệ Nhân tạo
initAI();
await initPinecone();
await ensureMvpTables();

const app = express();

app.use(cors({ 
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Middleware to log all requests
app.use((req, res, next) => {
  if (req.path.includes('/templates')) {
    console.log(`[REQUEST LOG] ${req.method} ${req.path}`);
  }
  next();
});

// ── Serve uploaded files (local dev & production — chỉ đổi APP_BASE_URL trong .env)
app.use('/uploads', express.static(UPLOAD_DIR));

// ──────────────────────────────────────────────────────────────────────────
// SERVE FRONTEND STATIC FILES (PRODUCTION BUILD)
// ──────────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.join(__dirname, '../../client/dist');

// Serve index.html and static files from frontend build
app.use(express.static(frontendDistPath, {
  maxAge: '1d',
  etag: false
}));

// Load API Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/contracts', requireAuth, requireActive(), contractRoutes);
app.use('/v1/documents', requireAuth, requireActive(), documentRoutes);
app.use('/v1/categories', requireAuth, requireActive(), categoryRoutes);
app.use('/v1/tags', requireAuth, requireActive(), tagRoutes);
app.use('/v1/legal', requireAuth, requireActive(), legalRoutes);
app.use('/v1/settings', requireAuth, requireActive(), settingsRoutes);
app.use('/v1/templates', requireAuth, requireActive(), templateRoutes);
app.use('/v1/drafts', requireAuth, requireActive(), draftsRoutes);
app.use('/v1/integration', integrationRoutes);
app.use('/v1/admin', requireAuth, requireActive(), adminRoutes);
app.use('/v1/profile', requireAuth, requireActive(), profileRoutes);
app.use('/v1', requireAuth, requireActive(), phase3Routes);

// Health Check
app.get('/v1/health', async (req, res) => {
  const [dbHealth] = await Promise.all([getPrismaHealth()]);
  const ai = getAIStatus();
  const pinecone = getPineconeStatus();

  const isHealthy = dbHealth.ok;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    message: isHealthy ? 'Backend NodeJS đã hoạt động ổn định.' : 'Backend đang hoạt động nhưng có dịch vụ lỗi.',
    checks: {
      db: dbHealth,
      ai,
      pinecone,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────
// SPA FALLBACK ROUTE (CRITICAL FOR CLIENT ROUTING)
// ──────────────────────────────────────────────────────────────────────────
// Serve index.html for all non-API, non-static routes
// This allows React Router to handle all client-side routing
app.get(/^(?!\/v1|\/uploads).*$/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to serve application' });
    }
  });
});

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.' });
});

export default app;
