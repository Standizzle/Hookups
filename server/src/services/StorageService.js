import { writeFile, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Dev: files land on local disk under uploads/, served by @fastify/static.
// Prod: set AVATAR_STORAGE=s3 (+ the usual AWS_* env vars) to swap this for
// an S3/R2-backed implementation — same save()/remove() contract either way.
const UPLOAD_ROOT = path.resolve(import.meta.dirname, '../../uploads');
const PUBLIC_PREFIX = '/uploads';

function assertLocalDriver() {
  const driver = process.env.AVATAR_STORAGE ?? 'local';
  if (driver !== 'local') {
    throw new Error(`AVATAR_STORAGE=${driver} is not implemented — only 'local' is supported in this build.`);
  }
}

export const StorageService = {
  /**
   * @param {Buffer} buffer
   * @param {string} subdir e.g. 'avatars'
   * @param {string} ext e.g. 'webp'
   * @returns {Promise<string>} public URL path
   */
  async save(buffer, subdir, ext) {
    assertLocalDriver();
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(UPLOAD_ROOT, subdir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    return `${PUBLIC_PREFIX}/${subdir}/${filename}`;
  },

  /** @param {string} url public URL path previously returned by save() */
  async remove(url) {
    assertLocalDriver();
    if (!url || !url.startsWith(PUBLIC_PREFIX)) return;
    const rel = url.slice(PUBLIC_PREFIX.length);
    const abs = path.join(UPLOAD_ROOT, rel);
    if (!abs.startsWith(UPLOAD_ROOT)) return; // guard against path traversal
    await unlink(abs).catch(() => {});
  },
};
