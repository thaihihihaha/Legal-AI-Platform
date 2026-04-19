-- AlterTable: Add relation to Company for drafts
ALTER TABLE "companies" ADD COLUMN "drafts" TEXT;

-- CreateTable: drafts_generated
CREATE TABLE "drafts_generated" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "template_id" VARCHAR(100),
  "title" VARCHAR(500),
  "content" TEXT,
  "research_data" JSONB DEFAULT '{}',
  "validation_result" JSONB DEFAULT '{}',
  "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,

  CONSTRAINT "drafts_generated_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drafts_generated_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "drafts_generated_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

-- CreateIndex: drafts_generated
CREATE INDEX "drafts_generated_company_id_idx" ON "drafts_generated"("company_id");
CREATE INDEX "drafts_generated_user_id_idx" ON "drafts_generated"("user_id");
CREATE INDEX "drafts_generated_template_id_idx" ON "drafts_generated"("template_id");
CREATE INDEX "drafts_generated_status_idx" ON "drafts_generated"("status");
CREATE INDEX "drafts_generated_created_at_idx" ON "drafts_generated"("created_at" DESC);

-- CreateTable: draft_versions
CREATE TABLE "draft_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draft_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT,
  "changed_by" UUID,
  "summary" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "draft_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "draft_versions_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "drafts_generated"("id") ON DELETE CASCADE,
  CONSTRAINT "draft_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "draft_versions_draft_id_version_key" UNIQUE("draft_id", "version")
);

-- CreateIndex: draft_versions
CREATE INDEX "draft_versions_draft_id_idx" ON "draft_versions"("draft_id");
CREATE INDEX "draft_versions_created_at_idx" ON "draft_versions"("created_at");
