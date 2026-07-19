/**
 * Provider abstraction (plan §6.7). The AI layer supports multiple providers
 * through adapters; callers depend only on this interface.
 */

export interface AIGenerateRequest {
  /** System instructions — kept separate from untrusted retrieved content (§15.6). */
  system: string;
  /** User/content parts, already assembled by the prompt builder. */
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AIGenerateResponse {
  text: string;
  usage: AIUsage;
  /** Provider-reported stop reason; 'stop' means a normal completion. */
  finishReason: 'stop' | 'length' | 'safety' | 'other';
}

export interface AIProvider {
  readonly name: string;
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  embed(inputs: string[]): Promise<number[][]>;
  readonly embeddingDimensions: number;
}
