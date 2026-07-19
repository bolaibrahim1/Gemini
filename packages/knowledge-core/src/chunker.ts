/**
 * Content normalization and semantic chunking (plan §6.6 pipeline steps 6-9).
 *
 * Chunks are built by packing paragraphs up to a target size with overlap
 * carried between neighbors, so retrieval keeps local context. Exact
 * duplicate chunks are dropped (step 8).
 */

export interface ChunkOptions {
  /** Maximum characters per chunk. */
  maxChars?: number;
  /** Characters of trailing context repeated at the start of the next chunk. */
  overlapChars?: number;
}

export interface TextChunk {
  index: number;
  content: string;
}

const DEFAULT_MAX = 1200;
const DEFAULT_OVERLAP = 150;

export function normalizeContent(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    // Strip control characters except newline and tab.
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function chunkText(raw: string, options: ChunkOptions = {}): TextChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP;
  const text = normalizeContent(raw);
  if (!text) return [];

  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    // A single paragraph longer than the limit is split by sentences.
    .flatMap((p) => (p.length <= maxChars ? [p] : splitLongParagraph(p, maxChars)));

  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxChars) {
      chunks.push(current);
      const overlap = overlapChars > 0 ? current.slice(-overlapChars) : '';
      current = overlap ? `${overlap}\n${paragraph}` : paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);

  // Drop exact duplicates while preserving order.
  const seen = new Set<string>();
  const result: TextChunk[] = [];
  for (const content of chunks) {
    const key = content.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ index: result.length, content });
  }
  return result;
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  // Split on sentence boundaries (Latin and Arabic punctuation).
  const sentences = paragraph.split(/(?<=[.!?؟。])\s+/);
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      parts.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
    // A single sentence longer than the limit is hard-wrapped.
    while (current.length > maxChars) {
      parts.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current) parts.push(current);
  return parts;
}
