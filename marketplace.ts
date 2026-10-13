import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { auth, roles, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { KEY_PATTERN, signedGet, storageConfigured } from '../services/storage.js';

const r = Router();
const pub = { id: true, title: true, slug: true, description: true, type: true, price: true, createdAt: true } as const;
r.get('/products', async (req, res) => {
  const type = String(req.query.type || '').toUpperCase();
  res.json(await prisma.product.findMany({ where: { published: true, ...(type ? { type } : {}) }, orderBy: { createdAt: 'desc' }, select: pub }));
});
r.get('/library', auth, async (req: AuthRequest, res) => res.json((await prisma.productPurchase.findMany({ where: { userId: req.user!.id, status: 'SUCCESSFUL' }, include: { product: { select: pub } }, orderBy: { createdAt: 'desc' } })).map(x => x.product)));
r.post('/products', auth, roles('CREATOR', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  const p = z.object({ title: z.string().min(3).max(120), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().min(10).max(4000), type: z.enum(['PROMPT', 'TEMPLATE', 'EBOOK', 'DESIGN', 'VIDEO']), price: z.number().int().min(100), fileKey: z.string().regex(KEY_PATTERN).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid product' });
  res.status(201).json(await prisma.product.create({ data: { ...p.data, fileKey: p.data.fileKey ?? null, published: false, creatorId: req.user!.id } })); // needs admin approval
});
r.get('/products/:id/download', auth, async (req: AuthRequest, res) => {
  const bought = await prisma.productPurchase.findUnique({ where: { userId_productId: { userId: req.user!.id, productId: req.params.id } }, include: { product: true } });
  if (!bought || bought.status !== 'SUCCESSFUL') return res.status(403).json({ error: 'Purchase required' });
  if (!bought.product.fileKey) return res.status(404).json({ error: 'No file attached to this product yet' });
  if (!storageConfigured()) return res.status(503).json({ error: 'File storage is not configured.' });
  res.json({ url: await signedGet(bought.product.fileKey, { ttl: 300, downloadName: `${bought.product.slug}${path.extname(bought.product.fileKey)}` }) });
});
export default r;
