import crypto from 'crypto';

export function generateETag(content: Buffer | string): string {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return `"${hash.digest('hex')}"`;
}

export async function generateETagFromBuffer(buffer: Buffer): Promise<string> {
  return generateETag(buffer);
}
