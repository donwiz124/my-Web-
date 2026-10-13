import { Router } from 'express';
import { z } from 'zod';
import { auth, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { CREDIT_PACKS, getSettings, planPrice } from '../services/config.js';

const r = Router();
const CATS = ['AI', 'DESIGN', 'VIDEO', 'MARKETING', 'BUSINESS', 'FREELANCING', 'GENERAL'];

r.get('/community', optionalAuth, async (req: AuthRequest, res) => {
  const cat = String(req.query.category || '').toUpperCase();
  const posts = await prisma.communityPost.findMany({ where: { published: true, ...(CATS.includes(cat) ? { category: cat as any } : {}) }, include: { user: { select: { name: true } }, _count: { select: { comments: true, likes: true } }, likes: req.user ? { where: { userId: req.user.id }, select: { id: true } } : false }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(posts.map(({ likes, ...p }: any) => ({ ...p, likedByMe: Array.isArray(likes) && likes.length > 0 })));
});
r.get('/community/meta', async (_q, res) => {
  const [cats, top] = await Promise.all([prisma.communityPost.groupBy({ by: ['category'], where: { published: true }, _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 5 }), prisma.communityPost.groupBy({ by: ['userId'], where: { published: true }, _count: { _all: true }, orderBy: { _count: { userId: 'desc' } }, take: 5 })]);
  const users = await prisma.user.findMany({ where: { id: { in: top.map(t => t.userId) } }, select: { id: true, name: true } });
  res.json({ trending: cats.map(c => ({ category: c.category, posts: c._count._all })), topUsers: top.map(t => ({ name: users.find(u => u.id === t.userId)?.name || 'Member', posts: t._count._all })) });
});
r.post('/community', auth, async (req: AuthRequest, res) => {
  const p = z.object({ title: z.string().trim().max(140).optional(), body: z.string().trim().min(3).max(3000), category: z.enum(CATS as [string, ...string[]]).default('GENERAL') }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Write something first (at least 3 characters)' });
  res.status(201).json(await prisma.communityPost.create({ data: { userId: req.user!.id, title: p.data.title || p.data.body.slice(0, 60), body: p.data.body, category: p.data.category as any } }));
});
r.get('/community/:id/comments', async (req, res) => res.json(await prisma.communityComment.findMany({ where: { postId: req.params.id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' }, take: 100 })));
r.post('/community/:id/comments', auth, async (req: AuthRequest, res) => {
  const p = z.object({ body: z.string().trim().min(1).max(1500) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Comment is empty' });
  if (!(await prisma.communityPost.findFirst({ where: { id: req.params.id, published: true } }))) return res.status(404).json({ error: 'Post not found' });
  res.status(201).json(await prisma.communityComment.create({ data: { postId: req.params.id, userId: req.user!.id, body: p.data.body } }));
});
r.post('/community/:id/like', auth, async (req: AuthRequest, res) => {
  const where = { postId_userId: { postId: req.params.id, userId: req.user!.id } };
  if (await prisma.communityLike.findUnique({ where })) { await prisma.communityLike.delete({ where }); return res.json({ liked: false }); }
  if (!(await prisma.communityPost.findFirst({ where: { id: req.params.id, published: true } }))) return res.status(404).json({ error: 'Post not found' });
  await prisma.communityLike.create({ data: { postId: req.params.id, userId: req.user!.id } }); res.json({ liked: true });
});

r.get('/jobs', async (req, res) => {
  const type = String(req.query.type || '').toUpperCase();
  res.json(await prisma.job.findMany({ where: { published: true, ...(type ? { type: type as any } : {}) }, orderBy: { createdAt: 'desc' } }));
});
r.post('/jobs/:id/apply', auth, async (req: AuthRequest, res) => {
  const p = z.object({ message: z.string().trim().min(10).max(2000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Tell the employer a little about yourself (10+ characters)' });
  if (!(await prisma.job.findFirst({ where: { id: req.params.id, published: true } }))) return res.status(404).json({ error: 'Job not found' });
  try { res.status(201).json(await prisma.jobApplication.create({ data: { jobId: req.params.id, userId: req.user!.id, message: p.data.message } })); }
  catch { res.status(409).json({ error: 'You already applied to this job' }); }
});

r.get('/notifications', auth, async (req: AuthRequest, res) => res.json(await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 })));
r.patch('/notifications/read-all', auth, async (req: AuthRequest, res) => res.json(await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } })));
r.patch('/notifications/:id/read', auth, async (req: AuthRequest, res) => res.json(await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { read: true } })));

r.get('/certificates', auth, async (req: AuthRequest, res) => res.json(await prisma.certificate.findMany({ where: { userId: req.user!.id }, include: { course: { select: { title: true, slug: true } } }, orderBy: { completionDate: 'desc' } })));
r.get('/certificates/verify/:token', async (req, res) => {
  const c = await prisma.certificate.findUnique({ where: { verificationToken: req.params.token }, include: { user: true, course: true } });
  if (!c) return res.status(404).json({ valid: false });
  res.json({ valid: true, certificateId: c.certificateId, student: c.user.name, course: c.course.title, completionDate: c.completionDate, issuedBy: 'Wisdom C Chibuike (Donwiz Handsome)' });
});

r.get('/pricing', async (_q, res) => {
  const s = await getSettings();
  res.json({ yearlyDiscount: s.YEARLY_DISCOUNT, plans: { PRO: { MONTHLY: planPrice(s, 'PRO', 'MONTHLY'), YEARLY: planPrice(s, 'PRO', 'YEARLY') }, BUSINESS: { MONTHLY: planPrice(s, 'BUSINESS', 'MONTHLY'), YEARLY: planPrice(s, 'BUSINESS', 'YEARLY') } }, creditPacks: CREDIT_PACKS.map(c => ({ credits: c, price: s[`CREDITS_${c}_PRICE`] })), referralRate: s.REFERRAL_RATE, withdrawalMinimum: s.WITHDRAWAL_MINIMUM });
});
export default r;
