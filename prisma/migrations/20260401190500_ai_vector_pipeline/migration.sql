CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS report_embeddings (
  "reportId" TEXT PRIMARY KEY REFERENCES "Report"(id) ON DELETE CASCADE,
  "modelName" TEXT NOT NULL,
  embedding extensions.vector(768) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_embeddings_embedding_hnsw_idx
  ON report_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "ReportAIAnalysis_status_updatedAt_idx"
  ON "ReportAIAnalysis" (status, "updatedAt");

ALTER TABLE report_embeddings ENABLE ROW LEVEL SECURITY;
