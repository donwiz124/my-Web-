import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { auth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { CREDIT_PACKS, getSettings, planPrice } from '../services/config.js';
import { PROVIDERS, Provider, chargeCurrency, enabledProviders, initializeCharge, parseWebhook, toChargeMinor, verifyCharge } from '../services/payments.js';
import { fulfillTransaction } from '../services/fulfillment.js';

const r = Router();
const WEB = () => process.env.WEB_URL || 'http://localhost:3000';

const orderSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('COURSE'), courseId: z.string() }),
  z.object({ type: z.literal('CREDITS'), pack: z.number().refine(n => (CREDIT_PACKS as readonly number[]).includes(n)) }),
  z.object({ type: z.literal('SUBSCRIPTION'), plan: z.enum(['PRO', 'BUSINESS']), interval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY') }),
  z.object({ type: z.literal('MARKETPLACE'), productIds: z.array(z.string()).min(1).max(20) }),
]);

/** The price ALWAYS comes from the database/settings, never from the client. */
async function resolveOrder(o: z.infer<typeof orderSchema>, userId: string, s: Record<string, number>) {
  if (o.type === 'COURSE') {
    const c = await prisma.course.findFirst({ where: { id: o.courseId, published: true } });
    if (!c) throw new Error('Course not found');
    if ((await prisma.coursePurchase.findUnique({ where: { userId_courseId: { userId, courseId: c.id } } }))?.status === 'SUCCESSFUL') throw new Error('You already own this course');
    return { usd: c.price, title: c.title, meta: { courseId: c.id, title: `Course purchased: ${c.title}` } };
  }
  if (o.type === 'CREDITS') return { usd: s[`CREDITS_${o.pack}_PRICE`], title: `${o.pack} AI credits`, meta: { credits: o.pack } };
  if (o.type === 'SUBSCRIPTION') return { usd: planPrice(s, o.plan, o.interval), title: `${o.plan} membership (${o.interval.toLowerCase()})`, meta: { plan: o.plan, interval: o.interval } };
  const owned = (await prisma.productPurchase.findMany({ where: { userId, status: 'SUCCESSFUL' }, select: { productId: true } })).map(x => x.productId);
  const items = await prisma.product.findMany({ where: { id: { in: o.productIds.filter(id => !owned.includes(id)) }, published: true } });
  if (!items.length) throw new Error('Nothing to purchase');
  return { usd: items.reduce((n, p) => n + p.price, 0), title: `${items.length} marketplace item(s)`, meta: { productIds: items.map(p => p.id) } };
}

r.get('/providers', (_req, res) => res.json(enabledProviders()));

r.post('/initialize', auth, async (req: AuthRequest, res) => {
  const body = z.object({ provider: z.enum(PROVIDERS as [Provider, ...Provider[]]), order: orderSchema }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid order' });
  const provider = body.data.provider;
  if (!enabledProviders().includes(provider)) return res.status(503).json({ error: `${provider} is not configured on this server` });
  try {
    const s = await getSettings();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const o = await resolveOrder(body.data.order, user.id, s);
    if (!(o.usd > 0)) throw new Error('This item is not payable');
    const reference = `DWH_${crypto.randomUUID().replace(/-/g, '')}`, currency = chargeCurrency(provider), minor = toChargeMinor(provider, o.usd, s.NGN_PER_USD);
    const redirectUrl = `${WEB()}/checkout/verify?provider=${provider}&reference=${reference}`;
    const init = await initializeCharge(provider, { reference, email: user.email, minor, currency, title: o.title, redirectUrl });
    await prisma.transaction.create({ data: { userId: user.id, provider, providerRef: reference, type: body.data.order.type, amount: minor, usdAmount: o.usd, currency, status: 'PENDING', metadata: { ...o.meta, title: o.meta && 'title' in o.meta ? (o.meta as any).title : o.title, sessionId: (init as any).sessionId } } });
    res.json({ url: init.url, reference });
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : 'Could not start payment' }); }
});

r.post('/verify', auth, async (req: AuthRequest, res) => {
  const p = z.object({ reference: z.string().min(8), sessionId: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid reference' });
  const tx = await prisma.transaction.findUnique({ where: { providerRef: p.data.reference } });
  if (!tx || tx.userId !== req.user!.id) return res.status(404).json({ error: 'Transaction not found' });
  if (tx.status === 'SUCCESSFUL') return res.json({ status: 'SUCCESSFUL', type: tx.type });
  try {
    if (!(await verifyCharge(tx, p.data.sessionId))) return res.status(402).json({ status: 'PENDING', error: 'Payment not confirmed yet' });
    await fulfillTransaction(tx.id);
    res.json({ status: 'SUCCESSFUL', type: tx.type });
  } catch (e) { res.status(502).json({ error: e instanceof Error ? e.message : 'Verification failed' }); }
});

// Mounted with express.raw() in server.ts so signatures are checked against the exact bytes received.
export async function webhook(req: any, res: any) {
  const provider = req.params.provider as Provider;
  if (!PROVIDERS.includes(provider)) return res.sendStatus(404);
  const ref = parseWebhook(provider, req.body as Buffer, req.headers);
  if (!ref) return res.sendStatus(401);
  const tx = await prisma.transaction.findUnique({ where: { providerRef: ref } });
  if (!tx) return res.sendStatus(200);
  try { if (tx.status === 'PENDING' && (await verifyCharge(tx))) await fulfillTransaction(tx.id); res.sendStatus(200); }
  catch (e) { console.error('webhook failed', e); res.sendStatus(500); } // non-2xx makes the provider retry
}
export default r;
