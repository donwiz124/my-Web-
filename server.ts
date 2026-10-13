import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { prisma } from './services/prisma.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import learningRoutes from './routes/learning.js';
import paymentRoutes, { webhook } from './routes/payments.js';
import creditRoutes from './routes/credits.js';
import aiRoutes from './routes/ai-tools.js';
import marketRoutes from './routes/marketplace.js';
import platformRoutes from './routes/platform.js';
import referralRoutes from './routes/referrals.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';

if (process.env.NODE_ENV === 'production') {
  for (const k of ['JWT_SECRET', 'DATABASE_URL', 'WEB_URL', 'API_PUBLIC_URL']) if (!process.env[k]) throw new Error(`${k} must be set in production`);
  if (process.env.JWT_SECRET!.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
}
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'dev-only-jwt-secret-change-me-please-0000';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CORS_ORIGINS || process.env.WEB_URL || 'http://localhost:3000').split(','), credentials: false }));

// Webhooks need the raw body, so they are registered BEFORE express.json().
app.post('/api/payments/webhook/:provider', express.raw({ type: '*/*', limit: '1mb' }), webhook);
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_q, res) => { try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); } });

const authLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', rateLimit({ windowMs: 60e3, limit: 240, standardHeaders: true, legacyHeaders: false }));
app.use('/api/account', accountRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/ai-tools', aiRoutes);
app.use('/api/marketplace', marketRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

app.use((_q, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: any, _q: express.Request, res: express.Response, _n: express.NextFunction) => { console.error(err); res.status(500).json({ error: 'Something went wrong' }); });

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`DONWIZ API listening on :${port}`));
