import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { auth, AuthRequest } from '../middleware/auth.js';
import { randomToken } from '../services/config.js';
import { createUser } from '../services/users.js';
import { sendMail } from '../services/mailer.js';

const r = Router();
const WEB = () => process.env.WEB_URL || 'http://localhost:3000';
const hash = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
const sign = (u: { id: string; role: string }) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
const publicUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, membership: u.membership, creditBalance: u.creditBalance, emailVerified: u.emailVerified });
const password = z.string().min(8).max(128);

async function issueToken(userId: string, type: 'VERIFY' | 'RESET', ttlMs: number) {
  const token = randomToken();
  await prisma.authToken.create({ data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}
async function sendVerification(u: { id: string; email: string; name: string }) {
  const t = await issueToken(u.id, 'VERIFY', 48 * 3600e3);
  const link = `${WEB()}/verify-email?token=${t}`;
  await sendMail(u.email, 'Verify your DONWIZ HANDSOME account', `<p>Hi ${u.name},</p><p>Confirm your email: <a href="${link}">${link}</a></p>`);
}

r.post('/register', async (req, res) => {
  const p = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password, ref: z.string().max(40).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter a name, a valid email and a password of at least 8 characters' });
  if (await prisma.user.findUnique({ where: { email: p.data.email } })) return res.status(409).json({ error: 'An account with this email already exists' });
  const user = await createUser({ name: p.data.name, email: p.data.email, passwordHash: await bcrypt.hash(p.data.password, 12), ref: p.data.ref });
  sendVerification(user).catch(e => console.error('verification mail failed', e));
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

r.post('/login', async (req, res) => {
  const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).safeParse(req.body);
  const u = p.success ? await prisma.user.findUnique({ where: { email: p.data.email } }) : null;
  if (!p.success || !u || !(await bcrypt.compare(p.data.password, u.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(u), user: publicUser(u) });
});

r.post('/forgot-password', async (req, res) => {
  const p = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(req.body);
  if (p.success) {
    const u = await prisma.user.findUnique({ where: { email: p.data.email } });
    if (u) {
      const t = await issueToken(u.id, 'RESET', 3600e3); const link = `${WEB()}/reset-password?token=${t}`;
      sendMail(u.email, 'Reset your DONWIZ HANDSOME password', `<p>Reset your password (valid 1 hour): <a href="${link}">${link}</a></p>`).catch(() => {});
    }
  }
  res.json({ ok: true }); // same response whether or not the account exists
});

async function consume(token: string, type: string) {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const claimed = await prisma.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count ? row : null;
}

r.post('/reset-password', async (req, res) => {
  const p = z.object({ token: z.string().min(20), password }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const row = await consume(p.data.token, 'RESET');
  if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(p.data.password, 12) } });
  res.json({ ok: true });
});

r.post('/verify-email', async (req, res) => {
  const row = await consume(String(req.body?.token || ''), 'VERIFY');
  if (!row) return res.status(400).json({ error: 'This verification link is invalid or has expired' });
  await prisma.user.update({ where: { id: row.userId }, data: { emailVerified: true } });
  res.json({ ok: true });
});

r.post('/resend-verification', auth, async (req: AuthRequest, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!u || u.emailVerified) return res.json({ ok: true });
  await sendVerification(u); res.json({ ok: true });
});

// ---- Google sign-in (server-side authorization-code flow) ----
const API = () => process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
const googleOn = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const safeNext = (n: unknown) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '');
const loginError = (res: any, m: string) => res.redirect(`${WEB()}/login?error=${encodeURIComponent(m)}`);

r.get('/google', (req, res) => {
  if (!googleOn()) return loginError(res, 'Google sign-in is not configured yet');
  const nonce = randomToken().slice(0, 24);
  const state = jwt.sign({ n: nonce, next: safeNext(req.query.next), ref: typeof req.query.ref === 'string' ? req.query.ref.slice(0, 40) : '' }, process.env.JWT_SECRET!, { expiresIn: '10m' });
  res.cookie('g_state', nonce, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60e3 });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: `${API()}/api/auth/google/callback`, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }));
});

r.get('/google/callback', async (req, res) => {
  try {
    if (!googleOn()) return loginError(res, 'Google sign-in is not configured yet');
    const { code, state } = req.query as Record<string, string>;
    if (!code || !state) return loginError(res, 'Google sign-in was cancelled');
    const st = jwt.verify(String(state), process.env.JWT_SECRET!) as { n: string; next: string; ref: string };
    const cookie = /(?:^|; )g_state=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    if (!cookie || cookie !== st.n) return loginError(res, 'Sign-in session expired. Please try again.');
    res.clearCookie('g_state');
    const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: String(code), client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${API()}/api/auth/google/callback`, grant_type: 'authorization_code' }) });
    const t: any = await tr.json();
    if (!tr.ok || !t.access_token) return loginError(res, 'Google sign-in failed');
    const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } });
    const g: any = await ur.json();
    if (!ur.ok || !g.email || g.email_verified !== true) return loginError(res, 'Your Google email address is not verified');
    const email = String(g.email).toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) user = await createUser({ name: g.name || email.split('@')[0], email, passwordHash: await bcrypt.hash(randomToken(), 12), ref: st.ref || undefined, emailVerified: true });
    else if (!user.emailVerified) user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    res.redirect(`${WEB()}/auth/callback#token=${sign(user)}&next=${encodeURIComponent(st.next || '')}`);
  } catch (e) { console.error('google auth failed', e); loginError(res, 'Google sign-in failed'); }
});

export default r;
