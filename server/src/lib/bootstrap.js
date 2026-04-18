import { prisma } from './prisma.js';

export const ensureMvpTables = async () => {
  // ── Categories (dùng chung cho contracts / documents / templates) ────────────
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_categories_company_type ON categories(company_id, resource_type);
  `);

  // ── Tags ─────────────────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
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
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tags_company ON tags(company_id);
  `);

  // ── Contracts ─────────────────────────────────────────────────────────────────
  // Minimal bootstrap so MVP can run even when full init.sql has not been applied.
  await prisma.$executeRawUnsafe(`
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

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_contracts_company_created ON contracts(company_id, created_at DESC);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_contracts_company_expiry ON contracts(company_id, expiry_date);
  `);

  // Migrate existing contracts table nếu thiếu cột mới (ALTER TABLE IF NOT EXISTS không tồn tại trong PG)
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
    await prisma.$executeRawUnsafe(sql).catch(() => {}); // ignore if already exists
  }

  // ── ContractTag junction ──────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS contract_tags (
      contract_id UUID NOT NULL,
      tag_id      UUID NOT NULL,
      PRIMARY KEY (contract_id, tag_id),
      CONSTRAINT ct_contract_fk FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
      CONSTRAINT ct_tag_fk      FOREIGN KEY (tag_id)      REFERENCES tags(id)      ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
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

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_documents_company_created ON documents(company_id, created_at DESC);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL
  `).catch(() => {});
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'draft'
  `).catch(() => {});
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT
  `).catch(() => {});
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
  `).catch(() => {});
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT
  `).catch(() => {});
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()
  `).catch(() => {});
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
  `).catch(() => {});

  // ── DocumentTag junction ──────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS document_tags (
      document_id UUID NOT NULL,
      tag_id      UUID NOT NULL,
      PRIMARY KEY (document_id, tag_id),
      CONSTRAINT dt_document_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      CONSTRAINT dt_tag_fk      FOREIGN KEY (tag_id)      REFERENCES tags(id)      ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
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

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_company
    ON chat_sessions(company_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
    ON chat_sessions(user_id);
  `);

  await prisma.$executeRawUnsafe(`
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

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_messages_session
    ON messages(session_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_messages_company
    ON messages(company_id);
  `);
};
