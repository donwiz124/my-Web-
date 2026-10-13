import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { myCourses } from '../services/courses.js';
import { referralCode } from '../services/config.js';

const r = Router(); r.use(auth);
const sel = { id: true, name: true, email: true, role: true, membership: true, creditBalance: true, emailVerified: true, createdAt: true } as const;

r.get('/me', async (req: AuthRequest, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: sel });
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ ...u, referralCode: referralCode(u.id) });
});
r.patch('/me', async (req: AuthRequest, res) => {
  const p = z.object({ name: z.string().trim().min(2).max(80) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid name' });
  res.json(await prisma.user.update({ where: { id: req.user!.id }, data: p.data, select: sel }));
});
r.post('/change-password', async (req: AuthRequest, res) => {
  const p = z.object({ current: z.string(), next: z.string().min(8).max(128) }).safeParse(req.body);
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!p.success || !u || !(await bcrypt.compare(p.data.current, u.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect or the new password is too short' });
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(p.data.next, 12) } });
  res.json({ ok: true });
});
r.get('/dashboard', async (req: AuthRequest, res) => {
  const id = req.user!.id;
  const [u, courses, commission, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: sel }), myCourses(id),
    prisma.referralCommission.aggregate({ where: { referral: { referrerId: id }, status: { in: ['APPROVED', 'PAID'] } }, _sum: { amount: true } }),
    prisma.notification.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);
  const completed = courses.filter(c => c.percent === 100).length;
  res.json({ user: u, stats: { coursesPurchased: courses.length, completed, inProgress: courses.length - completed, credits: u?.creditBalance ?? 0, referralEarnings: commission._sum.amount || 0 }, courses: courses.slice(0, 3), notifications });
});
r.get('/transactions', async (req: AuthRequest, res) => res.json(await prisma.transaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 })));
r.get('/subscriptions', async (req: AuthRequest, res) => res.json(await prisma.subscription.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })));
export default r;
