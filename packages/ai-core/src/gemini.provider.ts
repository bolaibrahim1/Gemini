import { AIGenerateRequest, AIGenerateResponse, AIProvider } from './types';

export interface GeminiProviderOptions {
  apiKey: string;
  generationModel?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  baseUrl?: string;
  timeoutMs?: number;
}

interface GeminiGenerateResponseBody {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Gemini REST adapter (plan §6.7 initial provider). Uses the public
 * generativelanguage.googleapis.com API with an API key.
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly embeddingDimensions: number;

  private readonly apiKey: string;
  private readonly generationModel: string;
  private readonly embeddingModel: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiProviderOptions) {
    this.apiKey = options.apiKey;
    this.generationModel = options.generationModel ?? 'gemini-2.0-flash';
    this.embeddingModel = options.embeddingModel ?? 'text-embedding-004';
    this.embeddingDimensions = options.embeddingDimensions ?? 768;
    this.baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxOutputTokens ?? 1024,
      },
    };
    const data = await this.call<GeminiGenerateResponseBody>(
      `/models/${this.generationModel}:generateContent`,
      body,
    );

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const finishReason =
      candidate?.finishReason === 'STOP'
        ? 'stop'
        : candidate?.finishReason === 'MAX_TOKENS'
          ? 'length'
          : candidate?.finishReason === 'SAFETY'
            ? 'safety'
            : 'other';

    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      finishReason,
    };
  }

  async embed(inputs: string[]): Promise<number[][]> {
    const body = {
      requests: inputs.map((text) => ({
        model: `models/${this.embeddingModel}`,
        content: { parts: [{ text }] },
        outputDimensionality: this.embeddingDimensions,
      })),
    };
    const data = await this.call<{ embeddings?: Array<{ values: number[] }> }>(
      `/models/${this.embeddingModel}:batchEmbedContents`,
      body,
    );
    return (data.embeddings ?? []).map((e) => e.values);
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${detail.slice(0, 500)}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
