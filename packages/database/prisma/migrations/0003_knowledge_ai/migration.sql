CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('FILE', 'ARTICLE', 'FAQ');

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DISABLED');

-- AlterTable
ALTER TABLE "bots" ADD COLUMN     "knowledge_base_id" TEXT;

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "type" "KnowledgeSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'UPLOADED',
    "language" TEXT,
    "raw_content" TEXT,
    "error" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "embedding" vector(768),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "bot_id" TEXT,
    "operation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_bases_organization_id_idx" ON "knowledge_bases"("organization_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_organization_id_idx" ON "knowledge_sources"("organization_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_knowledge_base_id_status_idx" ON "knowledge_sources"("knowledge_base_id", "status");

-- CreateIndex
CREATE INDEX "knowledge_chunks_organization_id_knowledge_base_id_idx" ON "knowledge_chunks"("organization_id", "knowledge_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_source_id_index_key" ON "knowledge_chunks"("source_id", "index");

-- CreateIndex
CREATE INDEX "ai_requests_organization_id_created_at_idx" ON "ai_requests"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Approximate-nearest-neighbor index for retrieval (cosine distance).
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks"
  USING hnsw ("embedding" vector_cosine_ops);
