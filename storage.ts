import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Cloudflare R2 (S3-compatible). Private bucket: everything is served through short-lived signed URLs. */
const account = () => process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
export const storageConfigured = () => Boolean(account() && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
export const KEY_PATTERN = /^(videos|files)\/[A-Za-z0-9._-]{1,120}$/;

let client: S3Client | null = null;
const s3 = () => (client ??= new S3Client({ region: 'auto', endpoint: `https://${account()}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } }));
const Bucket = () => process.env.R2_BUCKET_NAME!;

export function signedGet(key: string, opts: { ttl?: number; downloadName?: string } = {}) {
  if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key');
  const name = opts.downloadName?.replace(/[^A-Za-z0-9._ -]/g, '_');
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: Bucket(), Key: key, ResponseContentDisposition: name ? `attachment; filename="${name}"` : undefined }), { expiresIn: opts.ttl ?? 600 });
}

export async function signedPut(kind: 'video' | 'file', filename: string, contentType: string) {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 8);
  const key = `${kind === 'video' ? 'videos' : 'files'}/${crypto.randomUUID()}${ext}`;
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: Bucket(), Key: key, ContentType: contentType }), { expiresIn: 3600 });
  return { key, url };
}
