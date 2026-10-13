import { Router } from 'express';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { aiConfigured, generateWithProvider } from '../services/ai-provider.js';

const r = Router();
r.get('/', async (_q, res) => res.json(await prisma.aiTool.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } })));
r.get('/usage', auth, async (req: AuthRequest, res) => res.json(await prisma.aiUsage.findMany({ where: { userId: req.user!.id }, include: { tool: { select: { name: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 30 })));

r.post('/:slug/generate', auth, async (req: AuthRequest, res) => {
  const p = z.object({ input: z.union([z.string().trim().min(3).max(4000), z.record(z.string(), z.any())]) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Describe what you want (at least 3 characters)' });
  const tool = await prisma.aiTool.findUnique({ where: { slug: req.params.slug } });
  if (!tool || !tool.active) return res.status(404).json({ error: 'Tool not found' });
  if (!aiConfigured()) return res.status(503).json({ error: 'AI generation is not available right now. No credits were used.' });
  const userId = req.user!.id;
  // 1) debit atomically (never below zero)
  const debit = await prisma.$transaction(async tx => {
    const u = await tx.user.findUnique({ where: { id: userId } });
    if (!u) return { error: 'User not found', code: 404 };
    if (tool.premium && u.membership === 'FREE') return { error: 'This tool needs a Pro or Business membership', code: 402 };
    const hit = await tx.user.updateMany({ where: { id: userId, creditBalance: { gte: tool.creditCost } }, data: { creditBalance: { decrement: tool.creditCost } } });
    if (hit.count === 0) return { error: 'Insufficient credits', code: 402 };
    const balance = u.creditBalance - tool.creditCost;
    if (tool.creditCost) await tx.creditTransaction.create({ data: { userId, amount: -tool.creditCost, reason: `AI tool: ${tool.name}`, balanceAfter: balance } });
    return { balance };
  });
  if ('error' in debit) return res.status(debit.code).json({ error: debit.error });
  // 2) generate outside the DB transaction; 3) refund on failure
  try {
    const output = await generateWithProvider(tool.slug, p.data.input);
    await prisma.aiUsage.create({ data: { userId, toolId: tool.id, credits: tool.creditCost, input: p.data.input as any, output } });
    res.json({ output, credits: debit.balance });
  } catch (e) {
    if (tool.creditCost) {
      const u = await prisma.user.update({ where: { id: userId }, data: { creditBalance: { increment: tool.creditCost } } });
      await prisma.creditTransaction.create({ data: { userId, amount: tool.creditCost, reason: `Refund: ${tool.name} failed`, balanceAfter: u.creditBalance } });
    }
    console.error('ai generation failed', e);
    res.status(502).json({ error: 'Generation failed. Your credits were refunded.' });
  }
});

r.get('/prompts/saved', auth, async (req: AuthRequest, res) => res.json(await prisma.savedPrompt.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })));
r.post('/prompts/save', auth, async (req: AuthRequest, res) => {
  const p = z.object({ title: z.string().trim().min(1).max(120).default('Saved prompt'), prompt: z.string().trim().min(1).max(8000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Nothing to save' });
  res.status(201).json(await prisma.savedPrompt.create({ data: { userId: req.user!.id, ...p.data } }));
});
r.delete('/prompts/:id', auth, async (req: AuthRequest, res) => { await prisma.savedPrompt.deleteMany({ where: { id: req.params.id, userId: req.user!.id } }); res.json({ ok: true }); });
export default r;
