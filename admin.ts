import { Router } from 'express';
import { z } from 'zod';
import { auth, roles, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { KEY_PATTERN, signedPut, storageConfigured } from '../services/storage.js';
import { DEFAULT_SETTINGS } from '../services/config.js';

const r = Router();
r.use(auth, roles('ADMIN', 'SUPER_ADMIN'));
const log = (req: AuthRequest, action: string, targetType: string, targetId?: string, metadata?: any) =>
  prisma.adminLog.create({ data: { adminId: req.user!.id, action, targetType, targetId, metadata } }).catch(() => {});
const bad = (res: any, msg = 'Invalid data') => res.status(400).json({ error: msg });

r.get('/overview', async (_q, res) => {
  const since = new Date(Date.now() - 7 * 864e5); since.setHours(0, 0, 0, 0);
  const [users, revenue, sales, pendingW, courses, aiUse, comm, paid, recent, week] = await Promise.all([
    prisma.user.count(), prisma.transaction.aggregate({ where: { status: 'SUCCESSFUL' }, _sum: { usdAmount: true } }),
    prisma.coursePurchase.count({ where: { status: 'SUCCESSFUL' } }), prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    prisma.course.count(), prisma.aiUsage.count(), prisma.referralCommission.aggregate({ _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { name: true } } } }),
    prisma.transaction.findMany({ where: { status: 'SUCCESSFUL', createdAt: { gte: since } }, select: { usdAmount: true, createdAt: true } }),
  ]);
  const chart = Array.from({ length: 7 }, (_, i) => { const d = new Date(since.getTime() + i * 864e5); return { date: d.toISOString().slice(5, 10), revenue: week.filter(t => t.createdAt.toDateString() === d.toDateString()).reduce((n, t) => n + t.usdAmount, 0) }; });
  res.json({ users, revenue: revenue._sum.usdAmount || 0, courseSales: sales, pendingWithdrawals: pendingW, courses, aiUsage: aiUse, commissions: comm._sum.amount || 0, withdrawn: paid._sum.amount || 0, chart, recent });
});

r.get('/users', async (req, res) => { const q = String(req.query.q || ''); res.json(await prisma.user.findMany({ where: q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, name: true, email: true, role: true, membership: true, creditBalance: true, emailVerified: true, createdAt: true } })); });
r.patch('/users/:id', async (req: AuthRequest, res) => {
  const p = z.object({ role: z.enum(['STUDENT', 'CREATOR', 'ADMIN', 'SUPER_ADMIN']).optional(), membership: z.enum(['FREE', 'PRO', 'BUSINESS']).optional(), addCredits: z.number().int().min(-100000).max(100000).optional() }).safeParse(req.body);
  if (!p.success) return bad(res);
  if ((p.data.role === 'ADMIN' || p.data.role === 'SUPER_ADMIN') && req.user!.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only a super admin can grant admin roles' });
  if (p.data.role && req.params.id === req.user!.id) return bad(res, 'You cannot change your own role');
  const { addCredits, ...data } = p.data;
  const u = await prisma.$transaction(async db => {
    let user = await db.user.update({ where: { id: req.params.id }, data });
    if (addCredits) { user = await db.user.update({ where: { id: user.id }, data: { creditBalance: Math.max(0, user.creditBalance + addCredits) } }); await db.creditTransaction.create({ data: { userId: user.id, amount: addCredits, reason: 'Admin adjustment', balanceAfter: user.creditBalance } }); }
    return user;
  });
  await log(req, 'user.update', 'User', u.id, p.data); res.json({ id: u.id, role: u.role, membership: u.membership, creditBalance: u.creditBalance });
});

const courseSchema = z.object({ title: z.string().min(3).max(140), slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().min(10), price: z.number().int().min(0), category: z.string().min(2), level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']), cover: z.string().default('ai'), instructor: z.string().default('Donwiz Handsome'), durationMinutes: z.number().int().min(1), outcomes: z.array(z.string()).default([]), requirements: z.array(z.string()).default([]), certificateEligible: z.boolean().default(true), published: z.boolean().default(false) });
r.get('/courses', async (_q, res) => res.json(await prisma.course.findMany({ orderBy: { createdAt: 'desc' }, include: { lessons: { orderBy: { order: 'asc' } }, _count: { select: { purchases: { where: { status: 'SUCCESSFUL' } } } } } })));
r.post('/courses', async (req: AuthRequest, res) => { const p = courseSchema.safeParse(req.body); if (!p.success) return bad(res); try { const c = await prisma.course.create({ data: p.data }); await log(req, 'course.create', 'Course', c.id); res.status(201).json(c); } catch { res.status(409).json({ error: 'Slug already exists' }); } });
r.patch('/courses/:id', async (req: AuthRequest, res) => { const p = courseSchema.partial().safeParse(req.body); if (!p.success) return bad(res); const c = await prisma.course.update({ where: { id: req.params.id }, data: p.data }); await log(req, 'course.update', 'Course', c.id, p.data); res.json(c); });
const lessonSchema = z.object({ title: z.string().min(2), videoKey: z.union([z.literal(''), z.string().regex(KEY_PATTERN)]).default(''), isPreview: z.boolean().default(false), order: z.number().int().min(1) });
r.post('/courses/:id/lessons', async (req: AuthRequest, res) => { const p = lessonSchema.safeParse(req.body); if (!p.success) return bad(res); const l = await prisma.lesson.create({ data: { ...p.data, courseId: req.params.id } }); await log(req, 'lesson.create', 'Lesson', l.id); res.status(201).json(l); });
r.patch('/lessons/:id', async (req: AuthRequest, res) => { const p = lessonSchema.partial().safeParse(req.body); if (!p.success) return bad(res); const l = await prisma.lesson.update({ where: { id: req.params.id }, data: p.data }); await log(req, 'lesson.update', 'Lesson', l.id); res.json(l); });
r.delete('/lessons/:id', async (req: AuthRequest, res) => { await prisma.lesson.delete({ where: { id: req.params.id } }); await log(req, 'lesson.delete', 'Lesson', req.params.id); res.json({ ok: true }); });

r.get('/products', async (_q, res) => res.json(await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })));
r.patch('/products/:id', async (req: AuthRequest, res) => { const p = z.object({ published: z.boolean().optional(), price: z.number().int().min(100).optional(), title: z.string().min(3).optional(), fileKey: z.string().regex(KEY_PATTERN).optional() }).safeParse(req.body); if (!p.success) return bad(res); const x = await prisma.product.update({ where: { id: req.params.id }, data: p.data }); await log(req, 'product.update', 'Product', x.id, p.data); res.json(x); });

const jobSchema = z.object({ title: z.string().min(3), company: z.string().min(2), description: z.string().min(10), location: z.string().default('Remote'), remote: z.boolean().default(true), payment: z.string().optional(), requirements: z.string().optional(), type: z.enum(['FREELANCE', 'FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT']).default('FREELANCE'), published: z.boolean().default(false) });
r.get('/jobs', async (_q, res) => res.json(await prisma.job.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { applications: true } } } })));
r.post('/jobs', async (req: AuthRequest, res) => { const p = jobSchema.safeParse(req.body); if (!p.success) return bad(res); const j = await prisma.job.create({ data: p.data }); await log(req, 'job.create', 'Job', j.id); res.status(201).json(j); });
r.patch('/jobs/:id', async (req: AuthRequest, res) => { const p = jobSchema.partial().safeParse(req.body); if (!p.success) return bad(res); const j = await prisma.job.update({ where: { id: req.params.id }, data: p.data }); await log(req, 'job.update', 'Job', j.id, p.data); res.json(j); });

r.get('/posts', async (_q, res) => res.json(await prisma.communityPost.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { name: true } } } })));
r.patch('/posts/:id', async (req: AuthRequest, res) => { const p = z.object({ published: z.boolean() }).safeParse(req.body); if (!p.success) return bad(res); const x = await prisma.communityPost.update({ where: { id: req.params.id }, data: p.data }); await log(req, 'post.moderate', 'CommunityPost', x.id, p.data); res.json(x); });

r.get('/tools', async (_q, res) => res.json(await prisma.aiTool.findMany({ orderBy: { createdAt: 'asc' } })));
r.patch('/tools/:id', async (req: AuthRequest, res) => { const p = z.object({ creditCost: z.number().int().min(0).max(1000).optional(), active: z.boolean().optional(), premium: z.boolean().optional() }).safeParse(req.body); if (!p.success) return bad(res); const t = await prisma.aiTool.update({ where: { id: req.params.id }, data: p.data }); await log(req, 'tool.update', 'AiTool', t.id, p.data); res.json(t); });

r.get('/transactions', async (_q, res) => res.json(await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { name: true, email: true } } } })));

r.get('/withdrawals', async (_q, res) => res.json(await prisma.withdrawal.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { name: true, email: true } } } })));
r.patch('/withdrawals/:id', async (req: AuthRequest, res) => {
  const p = z.object({ status: z.enum(['APPROVED', 'PAID', 'REJECTED']) }).safeParse(req.body); if (!p.success) return bad(res);
  const w = await prisma.withdrawal.findUnique({ where: { id: req.params.id } });
  if (!w) return res.status(404).json({ error: 'Not found' });
  const ok: Record<string, string[]> = { PENDING: ['APPROVED', 'PAID', 'REJECTED'], APPROVED: ['PAID', 'REJECTED'] };
  if (!ok[w.status]?.includes(p.data.status)) return bad(res, `Cannot move a ${w.status} withdrawal to ${p.data.status}`);
  const x = await prisma.withdrawal.update({ where: { id: w.id }, data: { status: p.data.status } });
  await prisma.notification.create({ data: { userId: w.userId, title: `Withdrawal ${p.data.status.toLowerCase()}`, body: `Your $${(w.amount / 100).toFixed(2)} withdrawal is now ${p.data.status.toLowerCase()}.` } });
  await log(req, 'withdrawal.update', 'Withdrawal', w.id, p.data); res.json(x);
});

r.get('/settings', async (_q, res) => { const rows = await prisma.setting.findMany(); const m: Record<string, string> = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [k, String(v)])); for (const x of rows) m[x.key] = x.value; res.json(m); });
r.put('/settings', async (req: AuthRequest, res) => {
  const p = z.record(z.string(), z.coerce.number().int().min(0)).safeParse(req.body); if (!p.success) return bad(res, 'Settings must be whole numbers');
  const keys = Object.keys(p.data).filter(k => k in DEFAULT_SETTINGS); 
  for (const k of keys) await prisma.setting.upsert({ where: { key: k }, update: { value: String(p.data[k]) }, create: { key: k, value: String(p.data[k]) } });
  await log(req, 'settings.update', 'Setting', undefined, p.data); res.json({ ok: true });
});

// Browser uploads straight to R2 with a one-hour signed PUT (bucket CORS must allow PUT from WEB_URL).
r.post('/upload-url', async (req: AuthRequest, res) => {
  const p = z.object({ kind: z.enum(['video', 'file']), filename: z.string().min(1).max(200), contentType: z.string().min(3).max(100) }).safeParse(req.body);
  if (!p.success) return bad(res);
  if (p.data.kind === 'video' && !p.data.contentType.startsWith('video/')) return bad(res, 'Please choose a video file');
  if (!storageConfigured()) return res.status(503).json({ error: 'Cloudflare R2 is not configured (R2_* variables).' });
  const out = await signedPut(p.data.kind, p.data.filename, p.data.contentType);
  await log(req, 'upload.sign', 'File', out.key); res.json(out);
});

r.get('/logs', async (_q, res) => res.json(await prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })));
export default r;
