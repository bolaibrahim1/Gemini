import { Global, Module } from '@nestjs/common';
import { AIProvider, GeminiProvider, MockAIProvider } from '@platform/ai-core';
import { env } from '../config/env';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './ai.tokens';

export function createAiProvider(): AIProvider {
  if (env.AI_PROVIDER === 'gemini') {
    if (!env.GEMINI_API_KEY) {
      throw new Error('AI_PROVIDER=gemini requires GEMINI_API_KEY');
    }
    return new GeminiProvider({
      apiKey: env.GEMINI_API_KEY,
      generationModel: env.GEMINI_GENERATION_MODEL,
      embeddingModel: env.GEMINI_EMBEDDING_MODEL,
    });
  }
  return new MockAIProvider();
}

@Global()
@Module({
  providers: [{ provide: AI_PROVIDER, useFactory: createAiProvider }, AiService],
  exports: [AiService],
})
export class AiModule {}
