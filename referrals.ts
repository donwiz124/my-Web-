import { Router } from 'express';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { getSettings, referralCode } from '../services/config.js';

const r = Router(); r.use(auth);

async function balance(userId: string, db: any = prisma) {
  const [earned, taken] = await Promise.all([
    db.referralCommission.aggregate({ where: { referral: { referrerId: userId }, status: 'APPROVED' }, _sum: { amount: true } }),
    db.withdrawal.aggregate({ where: { userId, status: { in: ['PENDING', 'APPROVED', 'PAID'] } }, _sum: { amount: true } }),
  ]);
  const e = earned._sum.amount || 0, t = taken._sum.amount || 0;
  return { earned: e, withdrawnOrPending: t, available: Math.max(0, e - t) };
}

r.get('/me', async (req: AuthRequest, res) => {
  const rows = await prisma.referral.findMany({ where: { referrerId: req.user!.id }, include: { referredUser: { select: { name: true, createdAt: true } }, commissions: { select: { amount: true } } }, orderBy: { createdAt: 'desc' } });
  const s = await getSettings();
  res.json({ code: referralCode(req.user!.id), link: `${process.env.WEB_URL || 'http://localhost:3000'}/register?ref=${referralCode(req.user!.id)}`, rate: s.REFERRAL_RATE, count: rows.length, balance: await balance(req.user!.id), referrals: rows.map(x => ({ name: x.referredUser.name, joinedAt: x.referredUser.createdAt, earned: x.commissions.reduce((n, c) => n + c.amount, 0) })) });
});
r.get('/withdrawals', async (req: AuthRequest, res) => res.json({ balance: await balance(req.user!.id), items: await prisma.withdrawal.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } }) }));
r.post('/withdrawals', async (req: AuthRequest, res) => {
  const s = await getSettings();
  const p = z.object({ amount: z.number().int().positive(), payoutDetails: z.string().trim().min(8).max(500) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter an amount and your payout details (bank/account info)' });
  if (p.data.amount < s.WITHDRAWAL_MINIMUM) return res.status(400).json({ error: `Minimum withdrawal is $${(s.WITHDRAWAL_MINIMUM / 100).toFixed(2)}` });
  try {
    const w = await prisma.$transaction(async db => {
      const b = await balance(req.user!.id, db);
      if (p.data.amount > b.available) throw new Error('Amount exceeds your available balance');
      return db.withdrawal.create({ data: { userId: req.user!.id, amount: p.data.amount, payoutDetails: p.data.payoutDetails } });
    }, { isolationLevel: 'Serializable' });
    res.status(201).json(w);
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Withdrawal failed' }); }
});
export default r;
