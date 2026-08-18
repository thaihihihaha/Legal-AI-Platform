import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from './prisma.js';

/**
 * Chạy một câu DDL và KHÔNG BAO GIỜ ném.
 *
 * VÌ SAO: app.js gọi ensureMvpTables() bằng top-level await. Một promise reject ở đó làm hỏng việc
 * đánh giá module ESM ⇒ node thoát mã 1 ⇒ crash-loop. Và `CREATE TABLE IF NOT EXISTS` KHÔNG đủ để
 * phòng: nó chỉ bỏ qua khi CHÍNH bảng đó đã có, chứ không cứu khi bảng ĐƯỢC THAM CHIẾU (companies,
 * users) chưa tồn tại — lúc đó Postgres trả 42P01.
 *
 * Khác `.catch(() => {})` đang dùng rải rác: helper này CÓ LOG, để lỗi lược đồ còn chẩn đoán được
 * thay vì biến mất im lặng.
 */
const ddl = async (sql) => {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (e) {
    console.error(
      '[bootstrap] Bỏ qua DDL lỗi:',
      String(e.message).split('\n').pop().trim(),
      '| câu lệnh:',
      sql.trim().replace(/\s+/g, ' ').slice(0, 90)
    );
  }
};

/**
 * Bù các thiếu sót của database/init.sql so với schema.prisma trên ĐƯỜNG ĐĂNG NHẬP và quản trị.
 * Chạy mỗi lần khởi động, idempotent hoàn toàn — đây là đường DUY NHẤT chạm được cả những CSDL đã
 * triển khai từ trước, vì cổng to_regclass('companies') trong docker-entrypoint.sh khiến init.sql
 * không bao giờ chạy lại trên chúng.
 */
export const ensureAuthSchema = async () => {
  // ── users: 5 cột schema.prisma khai mà init.sql không tạo.
  //    Thiếu bất kỳ cột nào ⇒ prisma.user.findUnique() nổ ⇒ POST /v1/auth/login trả 500. ──
  await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`);
  await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64)`);
  await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false`);
  await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now()`);
  await ddl(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ`);

  // ── refresh_tokens: model RefreshToken KHÔNG có DDL ở bất kỳ đâu trong repo.
  //    tokenService.js gọi tới ngay trong luồng đăng nhập. ──
  await ddl(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT refresh_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  // Bồi cột cho CSDL đã được vá tay trước đó: CREATE TABLE IF NOT EXISTS im lặng bỏ qua bảng có sẵn.
  await ddl(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`);
  await ddl(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);
  await ddl(`CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_key ON refresh_tokens(token_hash)`);
  await ddl(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id)`);
  await ddl(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)`);

  // ── Cột kiểu ENUM Postgres mà schema.prisma khai String ⇒ Prisma lỗi chuyển đổi khi ĐỌC.
  //    documents.status là ca nặng nhất: làm chết cả danh sách tài liệu.
  //    Guard data_type='USER-DEFINED' ⇒ lần khởi động thứ hai là no-op. ──
  await ddl(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='documents'
                   AND column_name='status' AND data_type='USER-DEFINED') THEN
        ALTER TABLE documents ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE documents ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
        ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'active';
      END IF;
    END $$`);
  await ddl(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='chat_sessions'
                   AND column_name='agent_type' AND data_type='USER-DEFINED') THEN
        ALTER TABLE chat_sessions ALTER COLUMN agent_type DROP DEFAULT;
        ALTER TABLE chat_sessions ALTER COLUMN agent_type TYPE TEXT USING agent_type::text;
        ALTER TABLE chat_sessions ALTER COLUMN agent_type SET DEFAULT 'qa';
      END IF;
    END $$`);
  await ddl(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='messages'
                   AND column_name='role' AND data_type='USER-DEFINED') THEN
        ALTER TABLE messages ALTER COLUMN role TYPE TEXT USING role::text;
      END IF;
    END $$`);
  await ddl(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='contracts'
                   AND column_name='file_type' AND character_maximum_length < 200) THEN
        ALTER TABLE contracts ALTER COLUMN file_type TYPE VARCHAR(200);
      END IF;
    END $$`);

  // ── audit_logs: init.sql khai `id SERIAL`, schema.prisma khai @db.Uuid — không ALTER được.
  //    Chỉ dựng lại KHI kiểu sai VÀ bảng RỖNG, để không bao giờ mất nhật ký đã có.
  //    Thiếu actor_id thì logAction() ném, mà admin.js gọi nó CÙNG try với createUserByAdmin
  //    ⇒ POST /v1/admin/users tạo user xong vẫn trả 500 — chặn đường tạo tài khoản duy nhất. ──
  await ddl(`DO $$ BEGIN
      IF to_regclass('public.audit_logs') IS NOT NULL
         AND (SELECT data_type FROM information_schema.columns
              WHERE table_schema='public' AND table_name='audit_logs' AND column_name='id') IS DISTINCT FROM 'uuid'
         AND NOT EXISTS (SELECT 1 FROM audit_logs) THEN
        DROP TABLE audit_logs;
      END IF;
    END $$`);
  await ddl(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id    UUID,
      actor_id      UUID,
      action        VARCHAR(50) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id   UUID,
      changes       JSONB DEFAULT '{}'::jsonb,
      ip_address    VARCHAR(45),
      created_at    TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT audit_logs_actor_fk   FOREIGN KEY (actor_id)   REFERENCES users(id)     ON DELETE CASCADE,
      CONSTRAINT audit_logs_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    )`);
  await ddl(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id   UUID`);
  await ddl(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes    JSONB DEFAULT '{}'::jsonb`);
  await ddl(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`);
  await ddl(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs(actor_id)`);
  await ddl(`CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id)`);
};

/**
 * Tạo công ty + tài khoản quản trị ĐẦU TIÊN khi hệ thống chưa có người dùng nào.
 *
 * VÌ SAO CẦN: POST /v1/auth/register trả cứng 403, còn POST /v1/admin/users nằm sau requireAuth.
 * Không có bước này thì một bản triển khai mới là cánh cửa khoá không có chìa — đăng nhập bằng gì
 * cũng không được, và không có bất kỳ câu INSERT INTO users nào trong toàn bộ repo.
 *
 * Vai trò BẮT BUỘC là 'admin': requireSuperAdmin() = requireRole('admin') so khớp chuỗi chính xác,
 * và auth.js đặt is_super_admin = (role === 'admin'). Seed 'owner' hay 'superadmin' là tự khoá cửa.
 */
export const ensureFirstAdmin = async () => {
  let soNguoiDung = 0;
  try {
    const [row] = await prisma.$queryRaw`SELECT count(*)::int AS n FROM users`;
    soNguoiDung = row?.n ?? 0;
  } catch (e) {
    console.error('[seed] Không đếm được bảng users, bỏ qua tạo quản trị viên:', e.message);
    return;
  }
  // Đã có người dùng ⇒ TUYỆT ĐỐI không đụng vào. Đây là lớp bảo vệ cho các bản đã chạy thật.
  if (soNguoiDung > 0) return;

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@legal-ai.local';
  const sinhTuDong = !process.env.SEED_ADMIN_PASSWORD;
  const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const companyName = process.env.SEED_COMPANY_NAME || 'Công ty mặc định';
  const companySlug = process.env.SEED_COMPANY_SLUG || 'default';

  try {
    const hash = await bcrypt.hash(password, 10);
    // Một câu duy nhất: id công ty không đi vòng qua JS nên không dính lỗi ép kiểu uuid/text,
    // và không thể rơi vào trạng thái "có công ty nhưng không có quản trị viên".
    const inserted = await prisma.$executeRaw`
      WITH c AS (
        INSERT INTO companies (name, slug) VALUES (${companyName}, ${companySlug})
        ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id
      )
      INSERT INTO users (company_id, role, full_name, email, password_hash, is_active)
      SELECT c.id, 'admin'::user_role, 'Quản trị viên', ${email}, ${hash}, true FROM c
      ON CONFLICT (email) DO NOTHING`;

    if (inserted > 0) {
      console.log('==============================================================');
      console.log('[seed] Đã tạo tài khoản quản trị đầu tiên:');
      console.log(`[seed]   Email    : ${email}`);
      console.log(`[seed]   Mật khẩu : ${sinhTuDong ? password : '(lấy từ SEED_ADMIN_PASSWORD)'}`);
      console.log('[seed] Hãy đăng nhập rồi ĐỔI MẬT KHẨU ngay.');
      console.log('==============================================================');
    }
  } catch (e) {
    console.error('[seed] Tạo quản trị viên thất bại:', e.message);
  }
};

export const ensureMvpTables = async () => {
  // Bù lược đồ đường đăng nhập TRƯỚC, vì mọi thứ khác vô nghĩa nếu không ai vào được hệ thống.
  await ensureAuthSchema();

  // ── Categories (dùng chung cho contracts / documents / templates) ────────────
  await ddl(`
    CREATE TABLE IF NOT EXISTS categories (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id    UUID NOT NULL,
      parent_id     UUID,
      resource_type VARCHAR(50) NOT NULL DEFAULT 'contract',
      name          VARCHAR(200) NOT NULL,
      description   TEXT,
      color         VARCHAR(20),
      icon          VARCHAR(50),
      order_index   INT DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT categories_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      CONSTRAINT categories_parent_fk  FOREIGN KEY (parent_id)  REFERENCES categories(id) ON DELETE CASCADE
    );
  `);
  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_categories_company_type ON categories(company_id, resource_type);
  `);

  // ── Tags ─────────────────────────────────────────────────────────────────────
  await ddl(`
    CREATE TABLE IF NOT EXISTS tags (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      name       VARCHAR(100) NOT NULL,
      color      VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT tags_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      CONSTRAINT tags_company_name_uq UNIQUE (company_id, name)
    );
  `);
  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_tags_company ON tags(company_id);
  `);

  // ── Contracts ─────────────────────────────────────────────────────────────────
  // Minimal bootstrap so MVP can run even when full init.sql has not been applied.
  await ddl(`
    CREATE TABLE IF NOT EXISTS contracts (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id       UUID NOT NULL,
      uploaded_by      UUID,
      category_id      UUID,
      name             VARCHAR(500) NOT NULL,
      contract_type    VARCHAR(100),
      file_type        VARCHAR(50),
      file_path        TEXT,
      file_size        INT,
      extracted_text   TEXT,
      status           VARCHAR(50) DEFAULT 'active',
      workflow_status  VARCHAR(50) DEFAULT 'draft',
      review_result    JSONB,
      metadata         JSONB DEFAULT '{}'::jsonb,
      content          TEXT,
      notes            TEXT,
      effective_date   TIMESTAMPTZ,
      expiry_date      TIMESTAMPTZ,
      signed_date      TIMESTAMPTZ,
      party_a_name     VARCHAR(500),
      party_b_name     VARCHAR(500),
      party_b_tax_code VARCHAR(50),
      contract_value   NUMERIC(18,2),
      currency         VARCHAR(10) DEFAULT 'VND',
      created_at       TIMESTAMPTZ DEFAULT now(),
      updated_at       TIMESTAMPTZ DEFAULT now(),
      deleted_at       TIMESTAMPTZ,
      CONSTRAINT contracts_company_fk  FOREIGN KEY (company_id)  REFERENCES companies(id)  ON DELETE CASCADE,
      CONSTRAINT contracts_user_fk     FOREIGN KEY (uploaded_by) REFERENCES users(id)       ON DELETE SET NULL,
      CONSTRAINT contracts_category_fk FOREIGN KEY (category_id) REFERENCES categories(id)  ON DELETE SET NULL
    );
  `);

  // Migrate existing contracts table nếu thiếu cột mới — chạy TRƯỚC tạo index
  // (table contracts có thể đã tồn tại từ init.sql mà thiếu các cột này)
  const contractCols = [
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS category_id      UUID REFERENCES categories(id) ON DELETE SET NULL`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS file_path        TEXT`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS file_size        INT`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS workflow_status  VARCHAR(50) DEFAULT 'draft'`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes            TEXT`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS effective_date   TIMESTAMPTZ`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS expiry_date      TIMESTAMPTZ`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_date      TIMESTAMPTZ`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_a_name     VARCHAR(500)`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_b_name     VARCHAR(500)`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_b_tax_code VARCHAR(50)`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_value   NUMERIC(18,2)`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS currency         VARCHAR(10) DEFAULT 'VND'`,
  ];
  for (const sql of contractCols) {
    await ddl(sql).catch(() => {}); // ignore if already exists
  }

  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_contracts_company_created ON contracts(company_id, created_at DESC);
  `);
  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_contracts_company_expiry ON contracts(company_id, expiry_date);
  `);

  // ── ContractTag junction ──────────────────────────────────────────────────────
  await ddl(`
    CREATE TABLE IF NOT EXISTS contract_tags (
      contract_id UUID NOT NULL,
      tag_id      UUID NOT NULL,
      PRIMARY KEY (contract_id, tag_id),
      CONSTRAINT ct_contract_fk FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
      CONSTRAINT ct_tag_fk      FOREIGN KEY (tag_id)      REFERENCES tags(id)      ON DELETE CASCADE
    );
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      uploaded_by UUID,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      extracted_text TEXT,
      status TEXT DEFAULT 'uploaded',
      analysis JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      analyzed_at TIMESTAMPTZ,
      CONSTRAINT documents_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      CONSTRAINT documents_user_fk FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_documents_company_created ON documents(company_id, created_at DESC);
  `);
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL
  `).catch(() => {});
  
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'draft'
  `).catch(() => {});
  
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT
  `).catch(() => {});
  
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
  `).catch(() => {});
  
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT
  `).catch(() => {});
  
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()
  `).catch(() => {});
  
  await ddl(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
  `).catch(() => {});

  // Model Document khai source_contract_id (quan hệ Contract.linked_document). Thiếu cột này thì
  // DOCUMENT_SELECT dùng chung nổ ⇒ toàn bộ route /v1/documents trả 500.
  await ddl(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_contract_id UUID`);
  await ddl(`CREATE UNIQUE INDEX IF NOT EXISTS documents_source_contract_id_key ON documents(source_contract_id)`);

  // ── DocumentTag junction ──────────────────────────────────────────────────────
  await ddl(`
    CREATE TABLE IF NOT EXISTS document_tags (
      document_id UUID NOT NULL,
      tag_id      UUID NOT NULL,
      PRIMARY KEY (document_id, tag_id),
      CONSTRAINT dt_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      CONSTRAINT dt_tag_fk      FOREIGN KEY (tag_id)      REFERENCES tags(id)      ON DELETE CASCADE
    );
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      user_id UUID,
      title TEXT,
      agent_type TEXT DEFAULT 'qa',
      status TEXT DEFAULT 'active',
      metadata JSONB DEFAULT '{}'::jsonb,
      message_count INTEGER DEFAULT 0,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT chat_sessions_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      CONSTRAINT chat_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_company
    ON chat_sessions(company_id);
  `);

  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
    ON chat_sessions(user_id);
  `);

  await ddl(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL,
      company_id UUID NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT messages_session_fk FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      CONSTRAINT messages_company_fk FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_messages_session
    ON messages(session_id);
  `);

  await ddl(`
    CREATE INDEX IF NOT EXISTS idx_messages_company
    ON messages(company_id);
  `);
};
