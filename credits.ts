import { Router } from 'express';
import { auth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { CREDIT_PACKS, getSettings } from '../services/config.js';

const r = Router();
r.get('/packs', async (_q, res) => { const s = await getSettings(); res.json(CREDIT_PACKS.map(c => ({ credits: c, price: s[`CREDITS_${c}_PRICE`] }))); });
r.get('/balance', auth, async (req: AuthRequest, res) => res.json({ credits: (await prisma.user.findUnique({ where: { id: req.user!.id }, select: { creditBalance: true } }))?.creditBalance ?? 0 }));
r.get('/history', auth, async (req: AuthRequest, res) => res.json(await prisma.creditTransaction.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 })));
export default r;
