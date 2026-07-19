# Arabic-First Conversational AI Platform

Multi-tenant conversational AI SaaS for WhatsApp and website chat, targeting
Arabic-speaking businesses. See [docs/product/IMPLEMENTATION_PLAN.md](docs/product/IMPLEMENTATION_PLAN.md)
for the full product and technical implementation plan.

## Repository layout

```text
apps/
  api/            NestJS modular-monolith API
  web-dashboard/  Next.js dashboard (Arabic-first, RTL/LTR)
packages/
  database/       Prisma schema and generated client
  tsconfig/       Shared TypeScript configs
infrastructure/
  docker/         Local dev services and Dockerfiles
docs/
  product/        Implementation plan
```

## Getting started

Prerequisites: Node 22+, pnpm 9+, Docker.

```bash
# 1. Start local services (PostgreSQL + pgvector, Redis, MailHog)
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env

# 4. Create the database schema and generate the Prisma client
pnpm db:migrate

# 5. Run everything in dev mode
pnpm dev
```

- API: http://localhost:3001 (OpenAPI docs at `/docs`)
- Dashboard: http://localhost:3000 (redirects to `/ar`)
- MailHog UI: http://localhost:8025

## Current status

This is the Phase 1 foundation plus the Phase 2 data model from the plan:

- Authentication: register, email verification, login, refresh-token rotation
  with reuse detection, password reset, logout-all (plan §6.1, §15.1).
- Multi-tenancy: organizations, workspaces, invitations, eight default roles
  with a permission matrix enforced by a tenant guard (plan §6.2, §15.2).
- Bots: CRUD, pause/activate/archive lifecycle (plan §6.3).
- Flows: draft graph editing, validation (single trigger, reachability,
  required config, fallback branches), immutable versioned publishing with
  content hashes and deployment records (plan §6.4).
- Audit logging on sensitive actions (plan §11.10).
- Local Docker environment and CI pipeline (plan §16).

- Flow execution runtime (plan §6.4–6.5): a pure, deterministic engine in
  `packages/flow-core` (messages, inputs with Arabic-aware validation,
  conditions, switches, business hours, tags, handover, AI fallbacks, step
  limits), driven by a persistence layer with the channel-independent
  conversation model (contacts, conversations, messages, executions, step
  traces), a synchronous flow test simulator, and a BullMQ `inbound-events`
  queue + in-process flow worker with webhook deduplication.

Verified end-to-end against a live Postgres + Redis stack: register → org →
bot → flow → publish → multi-turn Arabic simulator conversation (invalid-input
reprompts, lead tagging, handover, bot silence under human ownership,
return-to-bot), plus the async worker path with idempotent redelivery.

- Knowledge base + AI orchestration (plan §6.6–6.7): `packages/ai-core`
  (provider abstraction with Gemini REST adapter and a deterministic offline
  mock provider, grounded prompt builder that isolates untrusted retrieved
  content, citation/groundedness helpers) and `packages/knowledge-core`
  (normalization, paragraph chunking with overlap, Arabic/English language
  detection, PDF/DOCX/TXT extraction). The API adds knowledge bases, sources
  (articles, FAQs, file uploads), a queue-backed ingestion worker
  (chunk → embed → store in pgvector with an HNSW index), tenant-scoped
  vector retrieval with top-K + similarity threshold, a grounded-answer
  pipeline with per-request token/latency tracking (`ai_requests`), an AI
  test console endpoint, and `ai.answer` flow nodes wired to RAG with
  low-confidence fallback to handover.

Verified end-to-end against live Postgres (pgvector) + Redis with the mock
provider: FAQ + article ingestion through the worker, grounded Arabic answers
with citations in the test console, off-topic questions rejected at the
similarity threshold, and a published bot answering from its knowledge base
through the flow engine — falling back to human handover on unrelated
questions. The Gemini adapter is code-complete but has not been exercised
against the live API (no key in this environment); set AI_PROVIDER=gemini and
GEMINI_API_KEY to enable it.

Next per the plan's initial priorities (§27): website widget, WhatsApp Cloud
API integration, team inbox, then contacts and campaigns.
