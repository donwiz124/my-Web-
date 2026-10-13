import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.js';

export type AuthRequest = Request & { user?: { id: string; role: string } };

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET!) as { id: string; role: string };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Attaches req.user when a valid token is present, but never blocks. */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET!) as { id: string; role: string }; } catch { /* ignore */ }
  }
  next();
}

/** Role check against the database (not the possibly stale JWT claim). */
export function roles(...allowed: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    if (!u || !allowed.includes(u.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user.role = u.role;
    next();
  };
}
