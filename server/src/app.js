import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contracts.js';
import documentRoutes from './routes/documents.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import legalRoutes from './routes/legal.js';
import settingsRoutes from './routes/settings.js';
import integrationRoutes from './routes/integration.js';
import templateRoutes from './routes/templates.js';
import adminRoutes from './routes/admin.js';
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

app.use(cors({ origin: getCorsOrigins() }));
app.use(express.json());

// ── Serve uploaded files (local dev & production — chỉ đổi APP_BASE_URL trong .env)
app.use('/uploads', express.static(UPLOAD_DIR));

// Load API Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/contracts', requireAuth, requireActive(), contractRoutes);
app.use('/v1/documents', requireAuth, requireActive(), documentRoutes);
app.use('/v1/categories', requireAuth, requireActive(), categoryRoutes);
app.use('/v1/tags', requireAuth, requireActive(), tagRoutes);
app.use('/v1/legal', requireAuth, requireActive(), legalRoutes);
app.use('/v1/settings', requireAuth, requireActive(), settingsRoutes);
app.use('/v1/templates', requireAuth, requireActive(), templateRoutes);
app.use('/v1/integration', integrationRoutes);
app.use('/v1/admin', requireAuth, requireActive(), adminRoutes);

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

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.' });
});

export default app;
