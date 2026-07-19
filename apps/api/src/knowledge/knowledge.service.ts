import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KnowledgeSourceStatus, KnowledgeSourceType, Prisma } from '@platform/database';
import { chunkText, detectLanguage, extractText, inferExtractableType } from '@platform/knowledge-core';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTextSourceInput {
  type: 'ARTICLE' | 'FAQ';
  name: string;
  /** Article body, or omitted for FAQ. */
  content?: string;
  /** FAQ pairs, required for FAQ sources. */
  pairs?: Array<{ question: string; answer: string }>;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 500_000;

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Knowledge bases
  // -------------------------------------------------------------------------

  list(orgId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { sources: true, chunks: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(orgId: string, kbId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: kbId, organizationId: orgId },
      include: {
        sources: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            name: true,
            status: true,
            language: true,
            error: true,
            chunkCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }

  async create(orgId: string, actorUserId: string, name: string, description?: string) {
    const kb = await this.prisma.knowledgeBase.create({
      data: { organizationId: orgId, name, description },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'knowledge_base.created',
      targetType: 'knowledge_base',
      targetId: kb.id,
    });
    return kb;
  }

  // -------------------------------------------------------------------------
  // Sources
  // -------------------------------------------------------------------------

  async createTextSource(orgId: string, actorUserId: string, kbId: string, input: CreateTextSourceInput) {
    await this.get(orgId, kbId);

    let rawContent: string;
    if (input.type === 'FAQ') {
      if (!input.pairs?.length) {
        throw new BadRequestException('FAQ sources require at least one question/answer pair');
      }
      rawContent = input.pairs
        .map((pair) => `${pair.question.trim()}\n${pair.answer.trim()}`)
        .join('\n\n');
    } else {
      if (!input.content?.trim()) {
        throw new BadRequestException('Article sources require content');
      }
      rawContent = input.content;
    }
    if (rawContent.length > MAX_TEXT_CHARS) {
      throw new BadRequestException('Source content is too large');
    }

    const source = await this.prisma.knowledgeSource.create({
      data: {
        organizationId: orgId,
        knowledgeBaseId: kbId,
        type: KnowledgeSourceType[input.type],
        name: input.name,
        rawContent,
        status: KnowledgeSourceStatus.UPLOADED,
      },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'knowledge_source.created',
      targetType: 'knowledge_source',
      targetId: source.id,
    });
    return source;
  }

  async createFileSource(
    orgId: string,
    actorUserId: string,
    kbId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    await this.get(orgId, kbId);

    // File validation (plan §15.5): size, extension, and MIME allowlist.
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds the 10 MB upload limit');
    }
    const type = inferExtractableType(file.originalname, file.mimetype);
    if (!type) {
      throw new BadRequestException('Unsupported file type. Allowed: PDF, DOCX, TXT');
    }

    let rawContent: string;
    try {
      rawContent = await extractText(type, file.buffer);
    } catch (error) {
      throw new BadRequestException(`Could not extract text: ${(error as Error).message}`);
    }
    if (!rawContent.trim()) {
      throw new BadRequestException('The file contains no extractable text');
    }

    const source = await this.prisma.knowledgeSource.create({
      data: {
        organizationId: orgId,
        knowledgeBaseId: kbId,
        type: KnowledgeSourceType.FILE,
        name: file.originalname,
        rawContent: rawContent.slice(0, MAX_TEXT_CHARS),
        status: KnowledgeSourceStatus.UPLOADED,
      },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'knowledge_source.uploaded',
      targetType: 'knowledge_source',
      targetId: source.id,
      metadata: { filename: file.originalname, size: file.size },
    });
    return source;
  }

  async deleteSource(orgId: string, actorUserId: string, sourceId: string) {
    const source = await this.requireSource(orgId, sourceId);
    // Chunks cascade with the source, removing it from future searches (§6.6).
    await this.prisma.knowledgeSource.delete({ where: { id: source.id } });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'knowledge_source.deleted',
      targetType: 'knowledge_source',
      targetId: sourceId,
    });
  }

  async requireSource(orgId: string, sourceId: string) {
    const source = await this.prisma.knowledgeSource.findFirst({
      where: { id: sourceId, organizationId: orgId },
    });
    if (!source) throw new NotFoundException('Knowledge source not found');
    return source;
  }

  // -------------------------------------------------------------------------
  // Ingestion (plan §6.6 pipeline) — runs on the knowledge-ingestion queue.
  // -------------------------------------------------------------------------

  async ingestSource(orgId: string, sourceId: string): Promise<void> {
    const source = await this.requireSource(orgId, sourceId);
    if (!source.rawContent) {
      await this.markFailed(source.id, 'Source has no content to process');
      return;
    }

    await this.prisma.knowledgeSource.update({
      where: { id: source.id },
      data: { status: KnowledgeSourceStatus.PROCESSING, error: null },
    });

    try {
      const chunks = chunkText(source.rawContent);
      if (chunks.length === 0) {
        await this.markFailed(source.id, 'No content chunks could be produced');
        return;
      }

      const vectors = await this.ai.embedTexts(orgId, chunks.map((c) => c.content));

      // Replace outdated chunks atomically: delete then re-insert with
      // embeddings, so a reindex never leaves mixed generations (§6.6).
      await this.prisma.$transaction(async (tx) => {
        await tx.knowledgeChunk.deleteMany({ where: { sourceId: source.id } });
        for (let i = 0; i < chunks.length; i++) {
          const vectorLiteral = `[${vectors[i].join(',')}]`;
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO knowledge_chunks
              (id, organization_id, knowledge_base_id, source_id, index, content, language, embedding, created_at)
            VALUES
              (gen_random_uuid(), ${orgId}, ${source.knowledgeBaseId}, ${source.id},
               ${chunks[i].index}, ${chunks[i].content}, ${detectLanguage(chunks[i].content)},
               ${vectorLiteral}::vector, now())
          `);
        }
        await tx.knowledgeSource.update({
          where: { id: source.id },
          data: {
            status: KnowledgeSourceStatus.READY,
            language: detectLanguage(source.rawContent ?? ''),
            chunkCount: chunks.length,
          },
        });
      });
    } catch (error) {
      this.logger.error(`Ingestion failed for source ${source.id}: ${(error as Error).message}`);
      await this.markFailed(source.id, (error as Error).message);
    }
  }

  private async markFailed(sourceId: string, error: string) {
    await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: KnowledgeSourceStatus.FAILED, error: error.slice(0, 500) },
    });
  }
}
