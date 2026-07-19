import mammoth from 'mammoth';

export type ExtractableType = 'pdf' | 'docx' | 'txt';

/** Extract plain text from an uploaded document (plan §6.6 pipeline step 5). */
export async function extractText(type: ExtractableType, buffer: Buffer): Promise<string> {
  switch (type) {
    case 'txt':
      return buffer.toString('utf8');
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case 'pdf': {
      // pdf-parse's index.js runs debug code when required from its own repo;
      // require the lib entrypoint directly to avoid it.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
        buffer: Buffer,
      ) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      return result.text;
    }
  }
}

export function inferExtractableType(filename: string, mimetype?: string): ExtractableType | null {
  const lowered = filename.toLowerCase();
  if (lowered.endsWith('.pdf') || mimetype === 'application/pdf') return 'pdf';
  if (
    lowered.endsWith('.docx') ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (lowered.endsWith('.txt') || lowered.endsWith('.md') || mimetype?.startsWith('text/')) {
    return 'txt';
  }
  return null;
}
