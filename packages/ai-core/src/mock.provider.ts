import { createHash } from 'node:crypto';
import { AIGenerateRequest, AIGenerateResponse, AIProvider } from './types';

/**
 * Deterministic offline provider for local development, CI, and tests.
 *
 * Embeddings are derived from token hashes so that texts sharing words end up
 * near each other in vector space — enough signal for retrieval tests without
 * network access. Generation echoes the first retrieved document so grounded
 * flows (citations, no-answer fallbacks) can be exercised end-to-end.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly embeddingDimensions: number;

  constructor(dimensions = 768) {
    this.embeddingDimensions = dimensions;
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const documents = [...request.prompt.matchAll(/<document[^>]*>\n([\s\S]*?)\n<\/document>/g)].map(
      (m) => m[1],
    );
    const isArabic = /[؀-ۿ]/.test(request.prompt);
    let text: string;
    if (documents.length === 0) {
      text = isArabic
        ? 'عذراً، لا أملك هذه المعلومة.'
        : 'Sorry, I do not have that information.';
    } else {
      const summary = documents[0].slice(0, 300);
      text = `${summary} [1]`;
    }
    return {
      text,
      usage: {
        inputTokens: Math.ceil((request.system.length + request.prompt.length) / 4),
        outputTokens: Math.ceil(text.length / 4),
      },
      finishReason: 'stop',
    };
  }

  async embed(inputs: string[]): Promise<number[][]> {
    return inputs.map((input) => this.embedOne(input));
  }

  private embedOne(input: string): number[] {
    const vector = new Array<number>(this.embeddingDimensions).fill(0);
    const tokens = input
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 1);
    for (const token of tokens) {
      const digest = createHash('sha256').update(token).digest();
      // Each token contributes to a few pseudo-random dimensions.
      for (let i = 0; i < 8; i++) {
        const index = digest.readUInt16BE(i * 2) % this.embeddingDimensions;
        const sign = digest[16 + i] % 2 === 0 ? 1 : -1;
        vector[index] += sign;
      }
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}
