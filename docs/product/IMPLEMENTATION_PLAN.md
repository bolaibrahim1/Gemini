# Arabic-First Conversational AI Platform
## Full Implementation Plan

**Document type:** Product and Technical Implementation Plan
**Target product:** Multi-tenant conversational AI SaaS for WhatsApp and website chat
**Primary markets:** Egypt, Saudi Arabia, GCC, and Arabic-speaking businesses
**Recommended stack:** NestJS, Next.js, PostgreSQL, Redis, BullMQ, pgvector, React Flow
**Document version:** 1.0
**Prepared for:** Imtyaaz

---

# 1. Executive Summary

This document defines the complete implementation plan for building an Arabic-first conversational AI platform similar in product category to BotZaki.

The platform will allow businesses to:

- Create AI-powered chatbots without writing code.
- Build automated customer journeys using a visual flow builder.
- Upload business documents and create searchable AI knowledge bases.
- Deploy bots to WhatsApp Business and business websites.
- Manage customer conversations through a shared team inbox.
- Transfer conversations between AI bots and human support agents.
- Import and segment customer contacts.
- Run approved WhatsApp template campaigns.
- Integrate external systems such as CRMs, order-management systems, booking systems, and payment services.
- Monitor bot quality, campaign performance, customer activity, AI usage, and support operations.
- Manage subscriptions, quotas, usage, and billing in a multi-tenant SaaS model.

The recommended implementation approach is a **modular monolith with independently scalable workers**. This keeps the initial system manageable while preserving a clean path to future service extraction.

The first sellable MVP should be delivered in approximately **20 to 24 weeks** using a team of 6 to 8 engineers and product specialists. A complete production-ready V1 is expected in approximately **30 to 36 weeks**.

---

# 2. Product Vision

## 2.1 Vision Statement

Build the leading Arabic-first AI customer engagement platform that turns WhatsApp and website conversations into automated support, qualified leads, bookings, orders, and measurable business outcomes.

## 2.2 Product Positioning

The product should not be positioned only as a chatbot builder.

Recommended positioning:

> An Arabic-first AI customer engagement and business automation platform for WhatsApp and websites.

## 2.3 Core Value Proposition

Businesses can configure an AI assistant using their own documents and workflows, deploy it across customer channels, and allow their teams to manage escalated conversations from one inbox.

## 2.4 Differentiators

- Arabic-first user interface and AI behavior.
- Egyptian Arabic, Gulf Arabic, Modern Standard Arabic, and mixed Arabic-English support.
- Visual workflow builder.
- Multi-provider AI architecture.
- Human handover and shared team inbox.
- WhatsApp campaign management.
- AI quality center for unanswered and low-confidence questions.
- Industry-specific starter templates.
- API and webhook integration builder.
- Strong multi-tenant security.
- Regional pricing and business-market focus.

---

# 3. Product Objectives

## 3.1 Primary Objectives

1. Allow a non-technical business owner to create and deploy a chatbot.
2. Automate repetitive customer support and sales interactions.
3. Ground AI answers in customer-provided business information.
4. Provide human agents with a shared customer support workspace.
5. Support compliant WhatsApp Business messaging and campaigns.
6. Provide reliable reporting, usage tracking, and subscription control.
7. Support multiple organizations, teams, bots, and communication channels.

## 3.2 Success Metrics

### Activation

- Percentage of registered organizations that create a bot.
- Percentage that publish a bot.
- Time from registration to first published chatbot.
- Percentage that connect WhatsApp or install the web widget.

### Engagement

- Monthly active organizations.
- Monthly active agents.
- Conversations per organization.
- Messages per active organization.
- Active bots per organization.

### Automation

- Bot resolution rate.
- Human handover rate.
- AI fallback rate.
- Flow completion rate.
- Average number of automated steps per conversation.

### Customer Support

- First response time.
- Average resolution time.
- SLA compliance rate.
- Reopen rate.
- Customer satisfaction score.

### Revenue

- Trial-to-paid conversion.
- Monthly recurring revenue.
- Average revenue per organization.
- Expansion revenue.
- Churn.
- Gross margin after AI and channel costs.

---

# 4. Target Users

## 4.1 Organization Owner

Responsible for subscription, organizational settings, security, and overall platform adoption.

## 4.2 Workspace Administrator

Manages bots, integrations, users, teams, channels, and business configuration.

## 4.3 Bot Builder

Creates flows, configures AI prompts, manages knowledge sources, tests bots, and publishes versions.

## 4.4 Support Agent

Handles escalated conversations, responds to customers, adds notes, uses canned replies, and resolves conversations.

## 4.5 Team Supervisor

Monitors agent activity, workloads, SLA performance, assignments, and conversation quality.

## 4.6 Campaign Manager

Imports contacts, defines segments, configures templates, schedules broadcasts, and reviews campaign analytics.

## 4.7 Analyst

Views analytics and exports reports without modifying operational data.

## 4.8 Platform Super Administrator

Manages tenants, plans, subscriptions, system failures, platform usage, security incidents, and support operations.

---

# 5. Scope Definition

## 5.1 MVP Scope

The MVP must include:

- Email and Google authentication.
- Organization and workspace management.
- Role-based access control.
- Bot creation and configuration.
- Visual flow builder.
- Flow test simulator.
- Versioned bot publishing.
- PDF, DOCX, TXT, URL, and manual FAQ knowledge sources.
- AI-powered grounded answers.
- Website chat widget.
- WhatsApp Cloud API integration.
- Shared inbox.
- Human handover.
- Contact profiles and tags.
- Basic analytics.
- Subscription plans and usage limits.
- Super-admin portal.
- Arabic and English interfaces.
- Audit logs.
- Queue-based background processing.
- Production monitoring and alerting.

## 5.2 V1 Scope

V1 adds:

- WhatsApp campaigns.
- Contact import and segmentation.
- Approved template synchronization.
- Scheduled campaigns.
- Advanced team inbox.
- Departments and SLA rules.
- AI agent assist.
- AI quality center.
- External tools and API actions.
- Billing automation.
- Advanced analytics.
- White-labeling basics.
- Industry templates.

## 5.3 Deferred Scope

The following should not be part of the first MVP:

- Native mobile applications.
- Voice calling bot.
- Full CRM functionality.
- Instagram and Messenger.
- Telegram.
- On-premise deployment.
- Multi-region active-active architecture.
- Marketplace for third-party extensions.
- Fully autonomous agents.
- Self-hosted language models.
- Advanced enterprise SSO.
- Full white-label custom domain support.

---

# 6. Functional Modules

## 6.1 Authentication and Identity

### Features

- Email/password registration.
- Email verification.
- Login.
- Google OAuth.
- Forgot password.
- Reset password.
- Refresh token rotation.
- Session management.
- Multi-factor authentication in V1.
- Account profile.
- Language preference.
- Time-zone preference.
- Account deactivation.
- Active-session revocation.

### Acceptance Criteria

- Unverified users cannot access protected organization resources.
- Refresh tokens are rotated and revocable.
- Password reset tokens expire and cannot be reused.
- Login attempts are rate-limited.
- Authentication events are logged.
- Arabic and English email templates are available.

---

## 6.2 Organization and Workspace Management

### Features

- Create organization.
- Create workspace.
- Switch workspace.
- Invite members.
- Accept or reject invitations.
- Remove members.
- Assign roles.
- Suspend members.
- Configure organization profile.
- Configure business industry.
- Configure default language and time zone.
- Configure organization retention settings.
- View workspace usage.

### Default Roles

- Owner.
- Admin.
- Bot Builder.
- Supervisor.
- Agent.
- Campaign Manager.
- Analyst.
- Viewer.

### Acceptance Criteria

- All business resources are tenant scoped.
- A user cannot access a workspace without active membership.
- Owners cannot accidentally remove the last organization owner.
- Role checks are enforced in the backend.
- Membership changes are audited.

---

## 6.3 Bot Management

### Features

- Create bot.
- Update bot details.
- Upload avatar.
- Configure default language.
- Configure supported languages.
- Configure tone.
- Configure business hours.
- Configure fallback messages.
- Configure AI model.
- Configure knowledge base.
- Configure handover conditions.
- Clone bot.
- Archive bot.
- Activate or pause bot.
- View bot deployments.
- View bot usage.

### Bot Statuses

- Draft.
- Testing.
- Published.
- Paused.
- Archived.

### Acceptance Criteria

- A bot cannot be published without a valid flow.
- Published versions are immutable.
- Pausing a bot stops new automated executions.
- Existing human conversations remain accessible.
- Every publish event creates a deployment record.

---

## 6.4 Visual Flow Builder

### Required UI Areas

- Node palette.
- Flow canvas.
- Node configuration panel.
- Variables panel.
- Validation panel.
- Test simulator.
- Version history.
- Publish action.
- Execution log viewer.

### MVP Node Types

#### Trigger Nodes

- Conversation started.
- Incoming message.
- Keyword trigger.

#### Message Nodes

- Text.
- Image.
- Document.
- Buttons.
- List options.

#### Input Nodes

- Ask text.
- Ask email.
- Ask phone.
- Ask number.
- Ask date.
- Ask choice.
- Confirmation.

#### Logic Nodes

- Condition.
- Switch.
- Wait.
- Business-hours condition.
- Variable check.
- Tag check.

#### AI Nodes

- AI answer.
- Intent classification.
- Information extraction.
- Translation.
- Sentiment detection.
- RAG knowledge query.

#### Action Nodes

- Set variable.
- Add tag.
- Remove tag.
- Update contact.
- Assign department.
- Assign agent.
- Call webhook.
- Call external API.
- Create ticket.
- Human handover.

#### Navigation Nodes

- Go to flow.
- End flow.
- Return to bot.

### Flow Versioning

Entities:

- Flow.
- FlowVersion.
- FlowNode.
- FlowEdge.
- FlowDeployment.

Publishing must:

1. Validate the flow.
2. Create an immutable version.
3. Store a content hash.
4. Link the bot deployment to that version.
5. Preserve active conversation compatibility.

### Flow Validation Rules

- Exactly one valid start node.
- Every executable node must be reachable.
- No invalid edge references.
- All required node fields are configured.
- Every condition has a fallback branch.
- Variable references must be valid.
- API nodes require timeout and failure handling.
- AI nodes require fallback behavior.
- Channel-specific nodes must be supported by the deployment channel.
- Infinite loops must be rejected unless explicit loop limits exist.

### Flow Execution States

- Created.
- Running.
- Waiting for input.
- Waiting for external result.
- Handed over.
- Completed.
- Failed.
- Cancelled.
- Expired.

### Execution Requirements

- Idempotent node execution.
- Per-conversation ordering.
- Durable state persistence.
- Recovery after worker restart.
- Maximum execution step limit.
- Node-level timeout.
- Retry policy.
- Dead-letter handling.
- Full execution trace.
- Sensitive-value masking in logs.

---

## 6.5 Conversation Engine

### Responsibilities

- Receive normalized inbound events.
- Resolve tenant, channel, contact, conversation, and bot.
- Detect duplicate events.
- Load current bot deployment.
- Load conversation state.
- Process waiting input.
- Execute flow nodes.
- Persist transitions.
- Create outbound messages.
- Trigger AI and external tools.
- Manage handover.
- Complete or pause execution.

### Conversation Ownership Modes

- Bot active.
- Waiting for human.
- Human active.
- Hybrid suggestion mode.
- Closed.

### Mandatory Rules

- The bot must not auto-reply while a human owns the conversation unless hybrid mode is enabled.
- Every inbound message must be linked to one conversation.
- Duplicate inbound webhook events must not produce duplicate replies.
- Message sequence must be preserved per channel conversation.
- Flow execution must happen asynchronously through workers.

---

## 6.6 Knowledge Base

### Supported Sources

- PDF.
- DOCX.
- TXT.
- CSV.
- Website URL.
- Sitemap.
- Manual article.
- FAQ pair.
- Product catalog.
- External API source in V1.

### Ingestion Pipeline

1. Upload source.
2. Validate file type and size.
3. Run malware scan.
4. Store original file.
5. Extract text.
6. Normalize content.
7. Detect language.
8. Remove duplicate content.
9. Split into semantic chunks.
10. Add source metadata.
11. Generate embeddings.
12. Store vectors.
13. Mark source as ready.
14. Record ingestion metrics.

### Source Statuses

- Uploaded.
- Validating.
- Processing.
- Ready.
- Failed.
- Updating.
- Disabled.
- Deleted.

### Knowledge Search Requirements

- Tenant filter.
- Bot filter.
- Knowledge-base filter.
- Language filter.
- Metadata filter.
- Top-K retrieval.
- Similarity threshold.
- Optional reranking.
- Citation references.
- Source freshness.
- Deleted-source exclusion.

### Acceptance Criteria

- No cross-tenant search results.
- Updating a document replaces outdated chunks safely.
- Deleting a source removes it from future searches.
- Failed source processing exposes an actionable error.
- Arabic retrieval quality is covered by automated evaluation.

---

## 6.7 AI Orchestration

### Supported Operations

- Generate grounded answer.
- Classify intent.
- Extract structured data.
- Summarize conversation.
- Detect sentiment.
- Translate content.
- Rewrite response.
- Select external tool.
- Generate suggested agent response.

### Provider Abstraction

The AI layer must support multiple providers through adapters.

```typescript
interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIStreamChunk>;
  embed(inputs: string[]): Promise<number[][]>;
}
```

Initial providers:

- Gemini.
- OpenAI as optional fallback.

Future providers:

- Anthropic.
- Azure OpenAI.
- Regional or self-hosted providers.

### AI Request Pipeline

1. Validate request.
2. Apply tenant plan limits.
3. Moderate input.
4. Detect language.
5. Retrieve relevant knowledge.
6. Construct structured prompt.
7. Select provider and model.
8. Generate result.
9. Validate structured output.
10. Apply groundedness checks.
11. Moderate output.
12. Record tokens, cost, latency, and result.
13. Return answer or fallback.

### Fallback Rules

- Low retrieval confidence.
- Provider unavailable.
- Timeout.
- Invalid structured output.
- Unsafe response.
- Tool failure.
- Repeated fallback count reached.

Fallback action options:

- Send configured fallback message.
- Ask a clarifying question.
- Create handover request.
- Route to specific department.
- Retry with backup model.

---

## 6.8 AI Tools and External Integrations

### Tool Examples

- Search product catalog.
- Get order status.
- Book appointment.
- Create support ticket.
- Create lead.
- Generate quotation.
- Check service availability.
- Send payment link.
- Query customer balance.
- Submit custom webhook.

### Tool Definition Fields

- Name.
- Description.
- Input JSON schema.
- Output JSON schema.
- Authentication method.
- Endpoint.
- HTTP method.
- Headers.
- Timeout.
- Retry policy.
- Confirmation requirement.
- Idempotency behavior.
- Allowed bots.
- Allowed roles.
- Sensitive fields.

### Security Rules

- Never expose stored credentials to the language model.
- Validate all tool inputs.
- Restrict outbound network access.
- Prevent SSRF.
- Use allowlisted domains.
- Require confirmation for destructive actions.
- Mask secrets in logs.
- Track every tool execution in audit logs.

---

## 6.9 Website Chat Widget

### Features

- Installation script.
- Floating launcher.
- Configurable position.
- Configurable colors and branding.
- Welcome message.
- Chat history.
- Anonymous sessions.
- Authenticated-user identity.
- Typing indicator.
- File upload.
- Buttons and lists.
- Human handover.
- Offline form.
- Arabic RTL.
- Mobile responsiveness.
- Domain allowlist.
- Consent message.
- Session expiration.
- Reconnect support.

### Widget SDK Requirements

- Asynchronous loading.
- Minimal impact on host page.
- Sandboxed styles.
- Versioned bundle.
- CDN delivery.
- Public deployment key.
- Domain validation.
- Signed user identity option.
- Short-lived session token.
- Rate limiting.
- WebSocket fallback strategy.

---

## 6.10 WhatsApp Cloud API Integration

### Connection Flow

1. Start connection wizard.
2. Complete Meta embedded signup.
3. Select business portfolio.
4. Select or create WhatsApp Business Account.
5. Select phone number.
6. Grant permissions.
7. Store encrypted integration credentials.
8. Register webhook.
9. Synchronize templates.
10. Send test message.
11. Activate channel.

### Supported Inbound Types

- Text.
- Image.
- Video.
- Audio.
- Document.
- Location.
- Contact.
- Button response.
- List response.
- Reaction.
- Unsupported-message fallback.

### Supported Outbound Types

- Text.
- Media.
- Interactive buttons.
- Lists.
- Location.
- Contact.
- Approved template messages.

### Reliability Requirements

- Webhook signature validation.
- Raw webhook storage.
- Event deduplication.
- Idempotent consumers.
- Per-conversation ordering.
- Queue retries.
- Dead-letter queue.
- Delivery status updates.
- Reconciliation jobs.
- Token-expiry monitoring.
- Template synchronization.
- Rate-limit handling.
- Error-code mapping.

### Template Management

- Import templates from Meta.
- Show language and category.
- Show approval status.
- Show quality status.
- Map variables.
- Send test.
- Refresh status.
- Store rejection reason.

---

## 6.11 Shared Team Inbox

### Layout

- Conversation list.
- Active conversation panel.
- Customer details panel.

### Conversation Statuses

- New.
- Open.
- Pending.
- Snoozed.
- Resolved.
- Closed.
- Spam.

### Features

- Search conversations.
- Filter by status.
- Filter by channel.
- Filter by agent.
- Filter by team.
- Filter by tag.
- Assign agent.
- Assign department.
- Add internal note.
- Mention teammate.
- Send text.
- Send media.
- Use canned response.
- View customer profile.
- View timeline.
- Add tags.
- Update custom fields.
- Trigger handover.
- Return conversation to bot.
- Resolve conversation.
- Reopen conversation.
- Display AI summary.
- Display suggested reply.
- Display sentiment.
- Show SLA timer.
- Show active agent presence.

### Collision Protection

- Show agents currently viewing the conversation.
- Show active typing agent.
- Use optimistic concurrency for outbound replies.
- Prevent duplicate sends.
- Use soft ownership locks.

---

## 6.12 Contacts and CRM-Lite

### Contact Fields

- First name.
- Last name.
- Phone.
- Email.
- WhatsApp identifier.
- Preferred language.
- Country.
- Time zone.
- Acquisition source.
- Assigned agent.
- Lead stage.
- Consent status.
- Last interaction.
- Created date.
- Custom fields.
- Tags.

### Features

- Contact list.
- Contact details.
- Conversation history.
- Contact timeline.
- Search.
- Filtering.
- Tagging.
- Bulk tagging.
- CSV import.
- CSV export.
- Duplicate detection.
- Custom fields.
- Consent history.
- Suppression status.
- Delete/anonymize contact.

---

## 6.13 Contact Segments

### Supported Conditions

- Tag.
- Custom-field value.
- Country.
- Language.
- Channel.
- Last interaction.
- Created date.
- Conversation count.
- Campaign interaction.
- Consent.
- Lead stage.
- Assigned agent.

### Logic

- AND groups.
- OR groups.
- Nested condition groups.
- Segment preview.
- Estimated audience size.
- Dynamic or static segments.

---

## 6.14 WhatsApp Campaigns

### Campaign Creation Flow

1. Create campaign.
2. Select WhatsApp channel.
3. Select approved template.
4. Select contact segment.
5. Map template variables.
6. Configure schedule.
7. Configure quiet hours.
8. Estimate recipients.
9. Estimate cost.
10. Send test.
11. Review compliance.
12. Launch or schedule.

### Statuses

- Draft.
- Scheduled.
- Preparing.
- Running.
- Paused.
- Completed.
- Failed.
- Cancelled.

### Metrics

- Audience.
- Queued.
- Sent.
- Delivered.
- Read.
- Replied.
- Failed.
- Opted out.
- Converted.
- Cost.
- Revenue attribution.

### Compliance Controls

- Opt-in source.
- Opt-in timestamp.
- Suppression list.
- Opt-out keywords.
- Quiet hours.
- Frequency caps.
- Duplicate prevention.
- Country-aware restrictions.
- Template validation.
- Audit log.

### Architecture

- Snapshot audience before sending.
- Split audience into batches.
- Queue each batch.
- Apply rate limits per WhatsApp number.
- Track idempotency per recipient.
- Consume delivery and read webhooks.
- Aggregate campaign analytics asynchronously.

---

## 6.15 Analytics

### Dashboard KPIs

- Total conversations.
- Unique contacts.
- Bot resolution rate.
- Handover rate.
- First response time.
- Resolution time.
- AI fallback rate.
- AI answer rate.
- Leads captured.
- Campaign delivery rate.
- Campaign reply rate.
- AI token usage.
- AI cost.
- Channel cost.
- Active agents.
- SLA breach rate.

### Bot Analytics

- Flow starts.
- Flow completions.
- Node drop-off.
- Node errors.
- Most common intents.
- Unanswered questions.
- Top knowledge sources.
- Low-confidence responses.
- Tool failures.
- AI latency.
- Average cost per conversation.

### Inbox Analytics

- Conversations per agent.
- First response time per agent.
- Resolution time.
- Reopen rate.
- SLA breaches.
- Workload.
- Customer satisfaction.

### Campaign Analytics

- Delivery funnel.
- Read rate.
- Reply rate.
- Conversion rate.
- Template performance.
- Segment performance.
- Cost per conversion.

### Event Model

Core analytics events:

- organization.created
- bot.created
- bot.published
- conversation.started
- message.received
- message.sent
- message.delivered
- message.read
- flow.started
- flow.node.entered
- flow.node.completed
- flow.node.failed
- ai.request.completed
- ai.low_confidence
- handover.requested
- agent.assigned
- conversation.resolved
- campaign.started
- campaign.message.sent
- campaign.message.read
- lead.created

---

## 6.16 Billing and Subscription

### Suggested Plans

#### Starter

- One workspace.
- One bot.
- Website widget.
- Two users.
- Limited conversations.
- Limited AI usage.
- Basic analytics.

#### Growth

- Multiple bots.
- WhatsApp.
- Team inbox.
- Campaigns.
- More users.
- Integrations.
- Advanced analytics.

#### Business

- Multiple channels.
- Departments.
- Custom roles.
- API access.
- Audit logs.
- Higher limits.
- Priority support.

#### Enterprise

- SSO.
- Dedicated environment.
- Custom retention.
- SLA.
- Private model configuration.
- Custom integration support.

### Usage Dimensions

- Active contacts.
- Inbound messages.
- Outbound messages.
- AI input tokens.
- AI output tokens.
- Embedding tokens.
- Storage.
- Bots.
- Agents.
- WhatsApp numbers.
- Campaign messages.

### Billing Features

- Trial.
- Plan selection.
- Upgrade.
- Downgrade.
- Cancel.
- Subscription suspension.
- Usage limits.
- Overage.
- Invoice history.
- Payment status.
- Billing notifications.
- Coupon support.
- Manual enterprise invoicing.

---

## 6.17 Notifications

### In-App Notifications

- Invitation received.
- Bot published.
- Bot failed to publish.
- Knowledge source processed.
- Knowledge source failed.
- WhatsApp disconnected.
- WhatsApp token expiring.
- Template approved.
- Template rejected.
- Conversation assigned.
- Mention received.
- SLA at risk.
- Campaign started.
- Campaign completed.
- Campaign failed.
- Usage threshold reached.
- Payment succeeded.
- Payment failed.
- Trial expiring.

### Email Notifications

- Verification.
- Invitation.
- Password reset.
- Trial reminder.
- Payment failure.
- Subscription change.
- Integration failure.
- Critical campaign failure.
- Security alert.

---

## 6.18 Super Admin

### Tenant Management

- View organizations.
- Search and filter tenants.
- View plan.
- View usage.
- View subscriptions.
- Suspend organization.
- Restore organization.
- Extend trial.
- Apply credits.
- Reset limits.
- View integrations.
- View tenant health.

### Operations

- Queue health.
- Failed jobs.
- Dead-letter jobs.
- Webhook errors.
- AI provider failures.
- Database health.
- Redis health.
- Storage failures.
- Campaign failure spikes.
- Expiring tokens.
- Template synchronization failures.

### Platform Configuration

- Plans.
- Features.
- Limits.
- AI providers.
- AI models.
- AI prices.
- Email templates.
- Feature flags.
- Maintenance mode.
- Supported file types.
- Maximum upload sizes.
- Retention defaults.

### Support Impersonation

- Read-only by default.
- Reason required.
- Time-limited.
- Full audit trail.
- Sensitive fields masked.
- Explicit elevated-mode confirmation.

---

# 7. Non-Functional Requirements

## 7.1 Availability

- MVP target: 99.5%.
- V1 target: 99.9%.
- Health checks for every service.
- Worker liveness monitoring.
- Automated restart.
- Managed database backups.

## 7.2 Performance

- API P95 under 500 ms for standard CRUD operations.
- Webhook acknowledgement under 2 seconds.
- Widget initial bundle under 250 KB compressed where practical.
- Realtime inbox updates under 2 seconds.
- AI response target under 8 seconds for standard grounded answers.
- Campaign processing must support controlled horizontal scaling.

## 7.3 Scalability

- Stateless API servers.
- Horizontally scalable workers.
- Redis-based queues.
- Partitionable event tables.
- Tenant-aware indexes.
- Read replicas when required.
- CDN-delivered widget assets.

## 7.4 Reliability

- Idempotent webhook processing.
- Idempotent outbound sends.
- Retry policies.
- Dead-letter queues.
- Durable job state.
- Execution recovery.
- Provider fallback.
- Reconciliation jobs.

## 7.5 Localization

- Arabic.
- English.
- RTL and LTR.
- Locale-aware dates and numbers.
- Arabic error messages.
- Arabic email templates.
- Arabic AI evaluations.
- Mixed Arabic-English input support.

## 7.6 Accessibility

- Keyboard navigation.
- Proper focus states.
- Semantic form controls.
- Accessible color contrast.
- Screen-reader labels.
- RTL accessibility testing.

---

# 8. Recommended Technical Architecture

## 8.1 Architecture Style

Start with:

> Modular monolith API plus independently deployed background workers.

Logical modules should be separated even when initially deployed from one repository.

## 8.2 Main Components

- Web dashboard.
- Super-admin dashboard.
- Website widget.
- API application.
- Realtime gateway.
- Webhook ingestion.
- Flow worker.
- AI worker.
- Knowledge-ingestion worker.
- Campaign worker.
- Media worker.
- Analytics worker.
- Scheduler.
- PostgreSQL.
- Redis.
- Object storage.
- CDN.

## 8.3 Recommended Technology Stack

### Frontend

- Next.js.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- TanStack Query.
- Zustand.
- React Hook Form.
- Zod.
- React Flow.
- Socket.IO client.
- next-intl.

### Backend

- NestJS.
- TypeScript.
- PostgreSQL.
- Prisma or TypeORM.
- Redis.
- BullMQ.
- Socket.IO.
- OpenAPI.
- pgvector.
- S3-compatible storage.

### Testing

- Jest.
- Supertest.
- Playwright.
- Testcontainers.
- Pact or schema contract testing where needed.
- k6 for load testing.

### DevOps

- Docker.
- GitHub Actions.
- Terraform.
- AWS ECS, Kubernetes later, or managed container platform.
- Managed PostgreSQL.
- Managed Redis.
- S3.
- CloudFront.
- Cloudflare.
- Sentry.
- OpenTelemetry.
- Prometheus and Grafana.

---

# 9. Monorepo Structure

```text
platform/
├── apps/
│   ├── api/
│   ├── web-dashboard/
│   ├── admin-dashboard/
│   ├── web-widget/
│   ├── webhook-ingestion/
│   ├── realtime-gateway/
│   ├── worker-flow/
│   ├── worker-ai/
│   ├── worker-knowledge/
│   ├── worker-campaign/
│   ├── worker-media/
│   └── worker-analytics/
├── packages/
│   ├── database/
│   ├── domain/
│   ├── auth/
│   ├── tenancy/
│   ├── permissions/
│   ├── events/
│   ├── queues/
│   ├── ai-core/
│   ├── channel-core/
│   ├── flow-core/
│   ├── knowledge-core/
│   ├── analytics-core/
│   ├── storage/
│   ├── observability/
│   ├── configuration/
│   ├── ui/
│   ├── eslint-config/
│   ├── tsconfig/
│   └── testing/
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   ├── monitoring/
│   └── scripts/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── product/
│   ├── operations/
│   └── security/
└── .github/
    └── workflows/
```

---

# 10. Backend Module Structure

```text
src/modules/
├── auth
├── users
├── organizations
├── workspaces
├── memberships
├── roles
├── permissions
├── bots
├── flows
├── deployments
├── conversations
├── messages
├── contacts
├── tags
├── custom-fields
├── inbox
├── teams
├── channels
├── whatsapp
├── web-widget
├── knowledge
├── ai
├── tools
├── campaigns
├── templates
├── segments
├── analytics
├── billing
├── usage
├── subscriptions
├── notifications
├── audit
├── feature-flags
├── integrations
├── webhooks
└── admin
```

---

# 11. Data Model

## 11.1 Identity

- users
- user_sessions
- oauth_accounts
- email_verifications
- password_reset_tokens
- mfa_methods

## 11.2 Multi-Tenancy

- organizations
- workspaces
- organization_members
- invitations
- roles
- permissions
- role_permissions
- member_roles

## 11.3 Bots and Flows

- bots
- bot_versions
- bot_deployments
- flows
- flow_versions
- flow_nodes
- flow_edges
- flow_executions
- flow_execution_steps
- flow_variables

## 11.4 Channels

- channel_connections
- channel_credentials
- whatsapp_accounts
- whatsapp_phone_numbers
- website_channels
- channel_webhook_events
- outbound_messages
- delivery_events
- message_templates

## 11.5 Conversations

- contacts
- contact_identifiers
- contact_tags
- tags
- custom_fields
- custom_field_values
- conversations
- conversation_participants
- conversation_assignments
- conversation_notes
- conversation_events
- messages
- message_attachments
- teams
- departments
- agent_presence

## 11.6 Knowledge

- knowledge_bases
- knowledge_sources
- knowledge_documents
- knowledge_chunks
- ingestion_jobs
- sync_runs

## 11.7 AI

- ai_providers
- ai_models
- bot_ai_configs
- ai_requests
- prompt_templates
- prompt_versions
- ai_tool_definitions
- ai_tool_executions

## 11.8 Campaigns

- campaigns
- campaign_segments
- segment_conditions
- audience_snapshots
- campaign_recipients
- campaign_messages
- campaign_events
- consent_records
- suppression_entries

## 11.9 Billing

- plans
- plan_features
- subscriptions
- subscription_items
- usage_events
- usage_aggregates
- invoices
- payments
- billing_provider_events
- coupons

## 11.10 Operations

- notifications
- audit_logs
- feature_flags
- system_settings
- webhook_logs
- failed_jobs
- api_keys
- integration_credentials

---

# 12. API Design

## 12.1 API Standards

- REST-first API.
- OpenAPI documentation.
- Consistent error envelope.
- Cursor pagination for large collections.
- Idempotency keys for sensitive create actions.
- Versioned public API.
- Tenant context derived from authenticated membership.
- Strict DTO validation.
- Request correlation IDs.
- Rate limiting.
- Audit logging.

## 12.2 Primary Routes

```text
/auth
/users
/organizations
/workspaces
/members
/roles
/permissions
/bots
/bot-versions
/flows
/flow-versions
/deployments
/channels
/whatsapp
/web-widget
/contacts
/tags
/custom-fields
/conversations
/messages
/inbox
/teams
/knowledge-bases
/knowledge-sources
/ai
/tools
/campaigns
/templates
/segments
/analytics
/billing
/subscriptions
/usage
/integrations
/webhooks
/notifications
/audit-logs
/admin
```

## 12.3 Important Endpoints

```http
POST /bots
PATCH /bots/:botId
POST /bots/:botId/clone
POST /bots/:botId/publish
POST /bots/:botId/pause

POST /flows
PATCH /flows/:flowId
POST /flows/:flowId/validate
POST /flows/:flowId/test
POST /flows/:flowId/publish

POST /knowledge-bases
POST /knowledge-bases/:id/sources
POST /knowledge-sources/:id/reindex
DELETE /knowledge-sources/:id

POST /channels/whatsapp/connect
POST /channels/whatsapp/:id/test
POST /webhooks/whatsapp
POST /webhooks/widget

GET /conversations
GET /conversations/:id
POST /conversations/:id/assign
POST /conversations/:id/messages
POST /conversations/:id/handover
POST /conversations/:id/return-to-bot
POST /conversations/:id/resolve

POST /campaigns
POST /campaigns/:id/test
POST /campaigns/:id/schedule
POST /campaigns/:id/pause
POST /campaigns/:id/cancel
```

---

# 13. Queue Design

## 13.1 Queues

- inbound-events
- flow-executions
- outbound-messages
- ai-requests
- knowledge-ingestion
- embedding-generation
- campaign-preparation
- campaign-delivery
- media-processing
- analytics-events
- email-notifications
- integration-calls
- scheduled-jobs
- dead-letter

## 13.2 Queue Requirements

- Idempotency key.
- Tenant ID.
- Correlation ID.
- Retry strategy.
- Exponential backoff.
- Maximum attempts.
- Dead-letter routing.
- Job timeout.
- Observability metadata.
- Sensitive payload masking.
- Per-conversation ordering.
- Per-channel rate limits.

---

# 14. Event Architecture

## 14.1 Domain Events

Domain events should be created inside application transactions and published through an outbox.

Examples:

- BotCreated.
- BotPublished.
- ConversationStarted.
- MessageReceived.
- MessageSent.
- FlowExecutionStarted.
- FlowExecutionFailed.
- HandoverRequested.
- AgentAssigned.
- CampaignScheduled.
- CampaignCompleted.
- KnowledgeSourceReady.
- SubscriptionChanged.

## 14.2 Transactional Outbox

Use a transactional outbox to avoid losing events between database commits and queue publishing.

Required process:

1. Business transaction writes entity changes.
2. Same transaction writes outbox event.
3. Outbox publisher reads pending events.
4. Event is published to queue.
5. Outbox event is marked as published.
6. Consumers process idempotently.

---

# 15. Security Plan

## 15.1 Authentication Security

- Argon2 password hashing.
- Short-lived access tokens.
- Refresh-token rotation.
- Session revocation.
- Device metadata.
- Rate limiting.
- Brute-force protection.
- MFA for administrators in V1.

## 15.2 Tenant Isolation

- Tenant ID added to every business table.
- Tenant resolved from authenticated membership.
- Repository layer automatically filters by tenant.
- Cross-tenant test suite.
- Unique indexes include tenant ID.
- Background jobs include validated tenant context.
- Storage paths are tenant scoped.

## 15.3 Secrets

- Cloud secret manager.
- Envelope encryption.
- Key rotation.
- No plaintext credentials in database.
- No secrets returned to frontend.
- Masked values in logs and support screens.

## 15.4 Webhook Security

- Signature verification.
- Timestamp validation when available.
- Raw-body validation.
- Replay protection.
- Event deduplication.
- Rate limiting.
- IP controls where provider support allows.

## 15.5 File Security

- File size limits.
- MIME validation.
- Extension validation.
- Malware scan.
- Private storage.
- Signed download URLs.
- Content sanitization.
- Parser isolation.

## 15.6 AI Security

- Treat retrieved documents as untrusted data.
- Separate system instructions from retrieved content.
- Restrict tools.
- Do not expose credentials to prompts.
- Validate structured outputs.
- Require confirmation for destructive tools.
- Block prompt-based cross-tenant requests.
- Audit tool execution.
- Moderate unsafe content.
- Detect prompt injection patterns.

## 15.7 External API Security

- Domain allowlist.
- SSRF protection.
- Restricted IP ranges.
- Timeout.
- Maximum response size.
- Redirect restriction.
- Credential isolation.
- Request and response schema validation.

## 15.8 Compliance Features

- Consent tracking.
- Data export.
- Data deletion.
- Contact anonymization.
- Configurable retention.
- Audit logs.
- Privacy policy.
- Data-processing agreements.
- Subprocessor registry.
- Breach-response procedure.

---

# 16. DevOps Plan

## 16.1 Environments

- Local.
- Development.
- Staging.
- Production.
- Preview environments where cost permits.

## 16.2 CI Pipeline

1. Install dependencies.
2. Validate lockfile.
3. Lint.
4. Format check.
5. Type check.
6. Unit tests.
7. Integration tests.
8. Build applications.
9. Generate OpenAPI.
10. Database migration validation.
11. Dependency scan.
12. Secret scan.
13. Container scan.
14. Upload artifacts.
15. Deploy development or staging.
16. Run E2E tests.
17. Manual production approval.
18. Production deployment.
19. Smoke tests.
20. Rollback if health checks fail.

## 16.3 Deployment

- Docker images.
- Rolling or blue-green deployment.
- Backward-compatible database migrations.
- Separate worker deployment.
- Health and readiness probes.
- Automated rollback.
- Feature flags for risky releases.

## 16.4 Infrastructure as Code

Terraform modules:

- Network.
- Database.
- Redis.
- Object storage.
- CDN.
- Container services.
- DNS.
- Certificates.
- Monitoring.
- Secret storage.
- Backup policies.

## 16.5 Backup and Disaster Recovery

- Daily database backups.
- Point-in-time recovery.
- Object-storage versioning.
- Quarterly restore tests.
- Redis treated as rebuildable where possible.
- Runbooks for database restore.
- Runbooks for queue failure.
- Runbooks for WhatsApp outage.
- Runbooks for AI provider outage.

---

# 17. Observability

## 17.1 Logging

Every log should include where applicable:

- requestId
- tenantId
- workspaceId
- userId
- botId
- conversationId
- messageId
- flowExecutionId
- jobId
- campaignId
- aiRequestId

## 17.2 Metrics

- API latency.
- API error rate.
- Queue depth.
- Queue latency.
- Worker failures.
- Webhook acknowledgement time.
- Outbound message failure rate.
- AI latency.
- AI error rate.
- AI cost.
- Database latency.
- Redis latency.
- Active WebSockets.
- Campaign throughput.

## 17.3 Alerts

- Increased API error rate.
- Database connection exhaustion.
- Redis unavailable.
- Queue backlog.
- Dead-letter growth.
- WhatsApp webhook failure.
- Outbound delivery failure spike.
- AI provider failure.
- AI latency spike.
- Token expiration.
- Failed payment webhooks.
- Campaign failure spike.
- Suspected cross-tenant access.
- Storage failure.

---

# 18. Testing Strategy

## 18.1 Unit Tests

Cover:

- Permissions.
- Tenant scoping.
- Flow validation.
- Node executors.
- Conditions.
- Variable interpolation.
- Segment evaluation.
- Usage calculations.
- Prompt construction.
- Webhook parsing.
- Template variable validation.
- Tool input validation.

## 18.2 Integration Tests

Cover:

- Database repositories.
- Transactions.
- Outbox publishing.
- Queue consumers.
- Redis locks.
- Object storage.
- AI provider adapters.
- Vector search.
- WhatsApp adapter.
- Billing webhooks.
- Realtime gateway.

## 18.3 E2E Tests

### Journey A: Website Bot

1. Register.
2. Create organization.
3. Create bot.
4. Add flow.
5. Add knowledge.
6. Publish bot.
7. Install widget.
8. Start customer conversation.
9. Receive AI response.
10. Request human.
11. Agent responds.
12. Resolve conversation.

### Journey B: WhatsApp Bot

1. Connect WhatsApp.
2. Synchronize templates.
3. Receive inbound message.
4. Execute flow.
5. Query knowledge.
6. Send response.
7. Update delivery status.
8. Handover to agent.
9. Return conversation to bot.

### Journey C: Campaign

1. Import contacts.
2. Validate consent.
3. Create segment.
4. Select approved template.
5. Send test.
6. Schedule campaign.
7. Process batches.
8. Receive delivery events.
9. View analytics.
10. Process opt-out.

## 18.4 AI Evaluation

Create a golden dataset per industry and language.

Metrics:

- Retrieval recall.
- Groundedness.
- Citation correctness.
- Hallucination rate.
- Intent accuracy.
- Entity extraction accuracy.
- Handover accuracy.
- Tool selection accuracy.
- Tool argument accuracy.
- Arabic dialect correctness.
- Response relevance.
- Unsafe-action rate.

## 18.5 Performance Tests

- Webhook bursts.
- 1,000 concurrent widget connections.
- Multiple high-volume tenants.
- Campaign batch processing.
- Slow AI provider.
- Redis interruption.
- Worker restart.
- Duplicate webhooks.
- Database failover.
- Large contact import.
- Large document ingestion.

## 18.6 Security Tests

- Cross-tenant access.
- Broken object-level authorization.
- Role escalation.
- Webhook replay.
- SSRF.
- Malicious file.
- Prompt injection.
- Tool abuse.
- Token theft.
- Rate-limit bypass.
- SQL injection.
- XSS in widget and inbox.
- CSV formula injection.
- Sensitive-data leakage.

---

# 19. Delivery Roadmap

## Phase 0: Discovery and Architecture

**Duration:** 2 weeks

### Deliverables

- Product requirements.
- Personas.
- User journeys.
- Competitor analysis.
- Permission matrix.
- Information architecture.
- Initial UI wireframes.
- Architecture decision records.
- ERD.
- API standards.
- AI provider decision.
- WhatsApp integration spike.
- React Flow spike.
- RAG Arabic-quality spike.
- Widget embedding spike.

### Exit Criteria

- Product scope approved.
- Architecture approved.
- Critical technical risks validated.
- Backlog ready.
- UX direction approved.

---

## Phase 1: Platform Foundation

**Duration:** 3 weeks

### Backend

- Monorepo.
- NestJS application.
- PostgreSQL.
- Redis.
- Authentication.
- Organizations.
- Workspaces.
- Invitations.
- Roles.
- Permissions.
- Audit logs.
- Feature flags.
- Notification foundation.

### Frontend

- Authentication screens.
- Onboarding.
- Main layout.
- Workspace switcher.
- Organization settings.
- Member management.
- RTL/LTR foundation.
- Shared design system.

### DevOps

- Docker.
- Development environment.
- Staging environment.
- CI pipeline.
- Logs.
- Error monitoring.

### Exit Criteria

- User can register and create workspace.
- User can invite team.
- Permissions work.
- Tenant isolation tests pass.
- Staging deployment is automated.

---

## Phase 2: Bot and Flow Builder

**Duration:** 5 weeks

### Backend

- Bot CRUD.
- Flow CRUD.
- Flow versions.
- Node schema.
- Flow validation.
- Execution state.
- Flow worker.
- Execution logs.
- Variables.
- Retry handling.

### Frontend

- Bot list.
- Bot settings.
- React Flow canvas.
- Node palette.
- Node configuration.
- Variables panel.
- Validation panel.
- Test simulator.
- Version history.
- Publish flow.

### Exit Criteria

- User builds a multi-step flow.
- User tests flow.
- User publishes immutable version.
- Conversation waits for input.
- Worker resumes safely after restart.

---

## Phase 3: Knowledge Base and AI

**Duration:** 4 weeks

### Backend

- Knowledge bases.
- Source upload.
- Extraction.
- Chunking.
- Embeddings.
- pgvector.
- RAG.
- Prompt configuration.
- Gemini adapter.
- AI usage tracking.
- Fallback.
- Citations.

### Frontend

- Knowledge source list.
- Upload flow.
- URL source.
- FAQ editor.
- Processing status.
- Failed-source error details.
- AI configuration.
- Test question console.

### Exit Criteria

- Arabic and English documents work.
- Answers cite sources.
- Low confidence triggers fallback.
- Tenant filters pass security tests.
- Tokens and costs are recorded.

---

## Phase 4: Website Widget

**Duration:** 3 weeks

### Deliverables

- Widget bundle.
- Installation snippet.
- Deployment key.
- Domain allowlist.
- Widget customization.
- Anonymous sessions.
- Realtime messaging.
- File upload.
- RTL.
- Human handover.
- Widget analytics.

### Exit Criteria

- Widget loads asynchronously.
- Conversation survives refresh.
- Unsupported domains are blocked.
- Widget uses published bot version.
- Mobile and RTL tests pass.

---

## Phase 5: WhatsApp Integration

**Duration:** 4 to 5 weeks

### Deliverables

- Meta app configuration.
- Embedded signup.
- Webhook verification.
- Inbound normalization.
- Outbound messaging.
- Media support.
- Status updates.
- Template synchronization.
- Test message.
- Retry queue.
- Error dashboard.
- Token monitoring.

### Exit Criteria

- Duplicate webhook does not duplicate response.
- Messages preserve order.
- Delivery states update.
- Template rules work.
- Human replies appear in conversation timeline.

---

## Phase 6: Shared Team Inbox

**Duration:** 4 weeks

### Deliverables

- Conversation list.
- Active chat.
- Contact sidebar.
- Assignment.
- Departments.
- Notes.
- Mentions.
- Canned replies.
- Tags.
- Search.
- Filters.
- Realtime updates.
- Handover.
- Return to bot.
- Agent presence.
- AI summary.
- Suggested reply.

### Exit Criteria

- Bot stops during human ownership.
- Realtime updates work.
- Assignments are audited.
- Duplicate human messages are prevented.
- Conversation can return safely to bot.

---

## Phase 7: Contacts and Campaigns

**Duration:** 4 weeks

### Deliverables

- Contacts.
- CSV import.
- Duplicate detection.
- Custom fields.
- Tags.
- Consent.
- Segments.
- Templates.
- Campaign builder.
- Test send.
- Scheduling.
- Batch workers.
- Suppression list.
- Analytics.

### Exit Criteria

- Only consented users are targeted.
- Audience snapshot is immutable.
- Pause and cancel work.
- Duplicate sends are prevented.
- Template variables validate before launch.

---

## Phase 8: Billing, Analytics, and Admin

**Duration:** 4 weeks

### Deliverables

- Plans.
- Trials.
- Subscriptions.
- Usage metering.
- Plan limits.
- Billing portal.
- Tenant analytics.
- Bot analytics.
- Inbox analytics.
- Campaign analytics.
- Super-admin dashboard.
- Operational health screens.

### Exit Criteria

- Usage limits enforce correctly.
- Payment events are idempotent.
- Admin can inspect tenant health.
- Sensitive support access is audited.
- Analytics reconcile with operational data.

---

## Phase 9: Hardening and Launch

**Duration:** 3 weeks

### Deliverables

- Full regression.
- Security review.
- Penetration testing.
- Performance testing.
- Disaster recovery test.
- AI evaluation benchmark.
- Production runbooks.
- Customer documentation.
- Support documentation.
- Beta onboarding.
- Production readiness review.

### Exit Criteria

- No open critical security issues.
- Recovery procedures tested.
- Production alerts configured.
- SLA and error budgets defined.
- Beta customers successfully onboarded.

---

# 20. Epic Backlog

## EPIC-001: Authentication

- User registration.
- Email verification.
- Login.
- Google authentication.
- Password reset.
- Session management.
- Logout from all devices.
- Security events.

## EPIC-002: Organizations and Workspaces

- Organization creation.
- Workspace creation.
- Member invitation.
- Role assignment.
- Workspace switcher.
- Tenant usage summary.

## EPIC-003: Bot Management

- Bot CRUD.
- Bot settings.
- Bot clone.
- Bot archive.
- Bot deployment.
- Bot pause.

## EPIC-004: Flow Builder

- Canvas.
- Nodes.
- Edges.
- Variables.
- Validation.
- Simulator.
- Versioning.
- Publishing.

## EPIC-005: Flow Runtime

- Execution engine.
- Node executors.
- Conversation state.
- Waiting input.
- Retry.
- Recovery.
- Logs.

## EPIC-006: Knowledge Base

- Sources.
- File processing.
- URL ingestion.
- Chunking.
- Embeddings.
- Search.
- Citations.
- Reindex.

## EPIC-007: AI Orchestration

- Providers.
- Prompts.
- RAG.
- Classification.
- Extraction.
- Summaries.
- Sentiment.
- Usage.

## EPIC-008: Website Widget

- SDK.
- Widget UI.
- Authentication.
- Realtime.
- Theme.
- History.
- Upload.
- Deployment.

## EPIC-009: WhatsApp

- Connection.
- Webhooks.
- Inbound.
- Outbound.
- Media.
- Templates.
- Statuses.
- Monitoring.

## EPIC-010: Inbox

- Conversation list.
- Agent response.
- Assignment.
- Notes.
- Teams.
- Search.
- Filters.
- Handover.
- Presence.

## EPIC-011: Contacts

- Contact profile.
- Custom fields.
- Tags.
- Timeline.
- Import.
- Export.
- Consent.

## EPIC-012: Campaigns

- Segments.
- Templates.
- Audience.
- Scheduling.
- Rate limiting.
- Delivery.
- Reporting.
- Opt-out.

## EPIC-013: Analytics

- Events.
- Aggregation.
- Dashboards.
- Exports.
- AI quality.
- Funnel reports.

## EPIC-014: Billing

- Plans.
- Subscriptions.
- Usage.
- Limits.
- Invoices.
- Payments.
- Trials.

## EPIC-015: Super Admin

- Tenant management.
- Plan management.
- Queue health.
- Error inspection.
- Support access.
- Feature flags.

## EPIC-016: Security and Compliance

- Audit logs.
- Data export.
- Data deletion.
- Retention.
- Secret management.
- Security testing.
- Consent.

---

# 21. Sprint Plan

Assuming two-week sprints:

## Sprint 1

- Monorepo.
- CI.
- Docker.
- Database.
- Redis.
- Authentication foundation.
- Design system.

## Sprint 2

- Organizations.
- Workspaces.
- Invitations.
- Roles.
- Permissions.
- Audit logs.

## Sprint 3

- Bot CRUD.
- Flow data model.
- Flow canvas foundation.
- Node schemas.

## Sprint 4

- Core nodes.
- Validation.
- Variables.
- Flow persistence.
- Versioning.

## Sprint 5

- Flow execution engine.
- Waiting input.
- Outbound queue.
- Execution logs.

## Sprint 6

- Knowledge sources.
- File processing.
- Chunking.
- Embeddings.
- Vector search.

## Sprint 7

- AI orchestration.
- RAG.
- Prompt settings.
- Fallback.
- AI test console.

## Sprint 8

- Website widget.
- Widget sessions.
- Realtime.
- Widget deployment.

## Sprint 9

- WhatsApp connection.
- Webhooks.
- Inbound message support.
- Outbound text.

## Sprint 10

- WhatsApp media.
- Templates.
- Status updates.
- Reliability.
- Error handling.

## Sprint 11

- Inbox.
- Conversation list.
- Agent responses.
- Contact sidebar.
- Assignment.

## Sprint 12

- Handover.
- Teams.
- Notes.
- Mentions.
- Search.
- Realtime presence.

## Sprint 13

- Contacts.
- Import.
- Tags.
- Custom fields.
- Consent.

## Sprint 14

- Segments.
- Templates.
- Campaign creation.
- Test send.

## Sprint 15

- Campaign scheduling.
- Batch delivery.
- Reporting.
- Suppression.

## Sprint 16

- Billing.
- Usage.
- Limits.
- Subscription lifecycle.

## Sprint 17

- Analytics.
- AI quality center.
- Super admin.

## Sprint 18

- Security.
- Load testing.
- Regression.
- Production readiness.

---

# 22. Definition of Ready

A story is ready when:

- Business objective is clear.
- User role is defined.
- Acceptance criteria are written.
- UX design exists where required.
- API contract is defined.
- Dependencies are identified.
- Security and permissions are defined.
- Analytics events are identified.
- Localization requirements are defined.
- Test scenarios are understood.

---

# 23. Definition of Done

A story is complete when:

- Code is reviewed.
- Unit tests pass.
- Integration tests pass where required.
- E2E tests are updated where required.
- Tenant isolation is verified.
- Permissions are verified.
- API documentation is updated.
- Analytics events are implemented.
- Audit events are implemented where required.
- Arabic and English UI are complete.
- Accessibility checks pass.
- Logs and metrics are added.
- Security checks pass.
- Deployed to staging.
- Product owner accepts the feature.

---

# 24. Team Structure

## Recommended Team

- Product Manager or Business Analyst.
- Technical Lead.
- Two Backend Engineers.
- Two Frontend Engineers.
- AI/RAG Engineer.
- QA Automation Engineer.
- UI/UX Designer.
- DevOps Engineer part-time initially.

## Responsibilities

### Product Manager

- Product scope.
- Backlog.
- Prioritization.
- Acceptance.
- Customer discovery.
- Release planning.

### Technical Lead

- Architecture.
- Technical standards.
- Security.
- Code quality.
- Cross-team decisions.
- Production readiness.

### Backend Engineers

- API.
- Database.
- Queues.
- Integrations.
- Conversation engine.
- Billing.
- Analytics.

### Frontend Engineers

- Dashboard.
- Flow builder.
- Inbox.
- Campaign UI.
- Widget.
- Admin portal.

### AI Engineer

- RAG.
- Embeddings.
- Evaluation.
- Prompting.
- Provider routing.
- Tool calling.
- AI quality controls.

### QA Engineer

- Test strategy.
- Automation.
- Regression.
- E2E.
- Load testing.
- Release validation.

### DevOps Engineer

- Infrastructure.
- CI/CD.
- Monitoring.
- Security tooling.
- Backups.
- Deployment.
- Incident response.

---

# 25. Estimated Delivery

## MVP

Includes:

- SaaS foundation.
- Bot builder.
- Flow runtime.
- Knowledge and RAG.
- Website widget.
- WhatsApp.
- Basic inbox.
- Basic analytics.
- Subscription limits.
- Super admin.

Estimated calendar duration:

**20 to 24 weeks**

## Complete V1

Adds:

- Campaigns.
- Advanced inbox.
- Billing automation.
- Advanced analytics.
- AI quality center.
- External tools.
- Industry templates.

Estimated calendar duration:

**30 to 36 weeks**

## Enterprise Version

Adds:

- SSO.
- Regional deployments.
- Advanced retention.
- Enterprise security.
- Dedicated infrastructure.
- Advanced SLAs.

Estimated total duration:

**38 to 46 weeks**

---

# 26. Key Risks

## Risk 1: WhatsApp Approval and Platform Constraints

### Mitigation

- Start Meta setup during discovery.
- Build channel abstraction.
- Use sandbox/test number early.
- Track template and account health.

## Risk 2: AI Hallucination

### Mitigation

- Grounded prompts.
- Confidence thresholds.
- Citations.
- AI evaluation suite.
- Human handover.
- Quality center.

## Risk 3: Cross-Tenant Data Leakage

### Mitigation

- Repository-level tenant scoping.
- Security test suite.
- Tenant-aware vector filters.
- Tenant-aware storage paths.
- Strict job context validation.

## Risk 4: Flow Runtime Complexity

### Mitigation

- Start with limited node types.
- Immutable versions.
- Explicit state machine.
- Execution step limits.
- Idempotent executors.
- Durable execution logs.

## Risk 5: Campaign Compliance

### Mitigation

- Consent records.
- Suppression list.
- Template validation.
- Frequency caps.
- Quiet hours.
- Audit trail.

## Risk 6: High AI Cost

### Mitigation

- Usage limits.
- Model routing.
- Prompt compression.
- Caching.
- RAG filtering.
- Token tracking.
- Plan-based quotas.

## Risk 7: Queue Backlog

### Mitigation

- Queue metrics.
- Horizontal workers.
- Tenant fairness.
- Rate limits.
- Priority queues.
- Dead-letter handling.

---

# 27. Initial Development Priorities

The implementation team should begin in this exact order:

1. Create monorepo and engineering standards.
2. Build authentication and tenant model.
3. Implement RBAC and tenant-isolation tests.
4. Build bot and flow schemas.
5. Implement limited visual flow builder.
6. Build durable flow execution runtime.
7. Add knowledge ingestion and RAG.
8. Build website widget.
9. Integrate WhatsApp.
10. Build team inbox.
11. Add contacts and campaigns.
12. Add billing, analytics, and admin operations.
13. Complete hardening and launch preparation.

Do not begin campaigns, advanced analytics, or native mobile development before the conversation runtime and channel processing are stable.

---

# 28. First 30-Day Execution Checklist

## Week 1

- Approve product scope.
- Confirm product name.
- Create repositories.
- Configure branching strategy.
- Configure CI.
- Configure local Docker environment.
- Approve architecture.
- Approve technology stack.
- Create initial ERD.
- Define permission matrix.

## Week 2

- Implement authentication.
- Implement users.
- Implement organizations.
- Implement workspaces.
- Implement memberships.
- Implement role checks.
- Add audit-log foundation.
- Build dashboard shell.

## Week 3

- Implement bot CRUD.
- Implement flow data model.
- Add React Flow canvas.
- Add start, text, input, condition, and end nodes.
- Add flow validation framework.

## Week 4

- Implement flow versions.
- Implement flow publish.
- Implement execution state.
- Implement BullMQ flow worker.
- Implement test simulator.
- Add first end-to-end flow test.

---

# 29. Launch Criteria

The platform is ready for beta when:

- At least three complete customer journeys pass E2E testing.
- WhatsApp inbound and outbound processing is reliable.
- Website widget is production-ready.
- Tenant isolation tests pass.
- AI groundedness meets the agreed benchmark.
- Audit logs cover sensitive actions.
- Queue monitoring is active.
- Backup and restore are tested.
- Billing limits work.
- Support runbooks exist.
- No critical or high-severity security issues remain.
- At least two pilot customers complete onboarding.

---

# 30. Final Recommendation

Build the product as a stable conversational automation platform rather than a collection of AI screens.

The most important engineering foundations are:

1. A channel-independent conversation model.
2. A durable, versioned flow execution engine.
3. A provider-independent AI layer.
4. Strict tenant isolation.
5. Reliable asynchronous message processing.
6. Human handover and inbox ownership controls.
7. Complete usage, cost, audit, and operational visibility.

The product should initially focus on Arabic-speaking service businesses, academies, clinics, e-commerce companies, real-estate companies, restaurants, and beauty providers.

The best commercial entry point is a focused MVP combining:

- WhatsApp automation.
- Website chatbot.
- Business knowledge base.
- Lead capture.
- Human support inbox.
- Arabic-first AI.

This creates a sellable product while preserving a clear path toward campaigns, commerce, bookings, advanced analytics, and enterprise automation.
