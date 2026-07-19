import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AIProvider,
  RetrievedChunk,
  buildGroundedPrompt,
  extractCitations,
  looksUnanswered,
} from '@platform/ai-core';
import { Prisma } from '@platform/database';
import { detectLanguage } from '@platform/knowledge-core';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { AI_PROVIDER } from './ai.tokens';

export interface KnowledgeSearchOptions {
  organizationId: string;
  knowledgeBaseId: string;
  query: string;
  topK?: number;
  similarityThreshold?: number;
}

export interface GroundedAnswer {
  answer: string;
  grounded: boolean;
  citations: Array<{ sourceId: string; sourceName: string; chunkId: string }>;
  chunks: RetrievedChunk[];
  usage: { inputTokens: number; outputTokens: number };
}

interface ChunkRow {
  id: string;
  source_id: string;
  source_name: string;
  content: string;
  similarity: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
  ) {}

  async embedTexts(organizationId: string, texts: string[]): Promise<number[][]> {
    const started = Date.now();
    try {
      const vectors = await this.provider.embed(texts);
      await this.recordRequest(organizationId, 'embed', 'ok', {
        inputTokens: Math.ceil(texts.join(' ').length / 4),
        latencyMs: Date.now() - started,
      });
      return vectors;
    } catch (error) {
      await this.recordRequest(organizationId, 'embed', 'error', {
        latencyMs: Date.now() - started,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Tenant-scoped vector retrieval (plan §6.6 "Knowledge Search
   * Requirements"): organization + knowledge-base filters, top-K, similarity
   * threshold, deleted/disabled sources excluded.
   */
  async searchKnowledge(options: KnowledgeSearchOptions): Promise<RetrievedChunk[]> {
    const topK = options.topK ?? env.RAG_TOP_K;
    const threshold = options.similarityThreshold ?? env.RAG_SIMILARITY_THRESHOLD;
    const [queryVector] = await this.embedTexts(options.organizationId, [options.query]);
    const vectorLiteral = `[${queryVector.join(',')}]`;

    const rows = await this.prisma.$queryRaw<ChunkRow[]>(Prisma.sql`
      SELECT c.id,
             c.source_id,
             s.name AS source_name,
             c.content,
             1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM knowledge_chunks c
      JOIN knowledge_sources s ON s.id = c.source_id
      WHERE c.organization_id = ${options.organizationId}
        AND c.knowledge_base_id = ${options.knowledgeBaseId}
        AND c.embedding IS NOT NULL
        AND s.status = 'READY'
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `);

    return rows
      .filter((row) => row.similarity >= threshold)
      .map((row) => ({
        id: row.id,
        sourceId: row.source_id,
        sourceName: row.source_name,
        content: row.content,
        similarity: row.similarity,
      }));
  }

  /**
   * Grounded answer pipeline (plan §6.7): retrieve, build a prompt that
   * separates instructions from untrusted content, generate, apply
   * groundedness checks, and record tokens and latency.
   */
  async answer(params: {
    organizationId: string;
    knowledgeBaseId: string;
    question: string;
    botId?: string;
    botName?: string;
    tone?: string;
  }): Promise<GroundedAnswer> {
    const chunks = await this.searchKnowledge({
      organizationId: params.organizationId,
      knowledgeBaseId: params.knowledgeBaseId,
      query: params.question,
    });

    const language = detectLanguage(params.question) === 'en' ? 'en' : 'ar';
    const empty = { inputTokens: 0, outputTokens: 0 };

    // Low retrieval confidence → fallback before spending generation tokens.
    if (chunks.length === 0) {
      await this.recordRequest(params.organizationId, 'answer', 'low_confidence', {
        botId: params.botId,
      });
      return { answer: '', grounded: false, citations: [], chunks: [], usage: empty };
    }

    const { system, prompt } = buildGroundedPrompt({
      question: params.question,
      chunks,
      language,
      botName: params.botName,
      tone: params.tone,
    });

    const started = Date.now();
    try {
      const response = await this.provider.generate({ system, prompt });
      const grounded =
        response.finishReason === 'stop' && response.text.trim() !== '' && !looksUnanswered(response.text);

      await this.recordRequest(params.organizationId, 'answer', grounded ? 'ok' : 'low_confidence', {
        botId: params.botId,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        latencyMs: Date.now() - started,
      });

      const citedIndices = extractCitations(response.text, chunks.length);
      const cited = (citedIndices.length > 0 ? citedIndices : chunks.map((_, i) => i + 1)).map(
        (i) => chunks[i - 1],
      );

      return {
        answer: response.text,
        grounded,
        citations: cited.map((c) => ({ sourceId: c.sourceId, sourceName: c.sourceName, chunkId: c.id })),
        chunks,
        usage: response.usage,
      };
    } catch (error) {
      this.logger.warn(`AI generation failed: ${(error as Error).message}`);
      await this.recordRequest(params.organizationId, 'answer', 'error', {
        botId: params.botId,
        latencyMs: Date.now() - started,
        error: (error as Error).message,
      });
      return { answer: '', grounded: false, citations: [], chunks, usage: empty };
    }
  }

  private async recordRequest(
    organizationId: string,
    operation: string,
    status: string,
    data: {
      botId?: string;
      inputTokens?: number;
      outputTokens?: number;
      latencyMs?: number;
      error?: string;
    } = {},
  ) {
    try {
      await this.prisma.aiRequest.create({
        data: {
          organizationId,
          botId: data.botId,
          operation,
          provider: this.provider.name,
          status,
          inputTokens: data.inputTokens ?? 0,
          outputTokens: data.outputTokens ?? 0,
          latencyMs: data.latencyMs ?? 0,
          error: data.error?.slice(0, 500),
        },
      });
    } catch (error) {
      // Usage accounting must never break the request path.
      this.logger.error(`Failed to record AI usage: ${(error as Error).message}`);
    }
  }
}
