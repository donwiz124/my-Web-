import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { auth, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/prisma.js';
import { ratingMap, myCourses } from '../services/courses.js';
import { signedGet, storageConfigured } from '../services/storage.js';

const r = Router();
const owns = async (userId: string, courseId: string) => (await prisma.coursePurchase.findUnique({ where: { userId_courseId: { userId, courseId } } }))?.status === 'SUCCESSFUL';

r.get('/courses', async (req, res) => {
  const q = String(req.query.q || '').trim(), level = String(req.query.level || '').toUpperCase(), category = String(req.query.category || '');
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(24, Number(req.query.limit) || 6);
  const where: any = { published: true };
  if (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) where.level = level;
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
  const [total, rows, cats] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: { id: true, title: true, slug: true, price: true, category: true, level: true, cover: true, durationMinutes: true, instructor: true, _count: { select: { lessons: true, purchases: { where: { status: 'SUCCESSFUL' } } } } } }),
    prisma.course.findMany({ where: { published: true }, distinct: ['category'], select: { category: true } }),
  ]);
  const ratings = await ratingMap(rows.map(c => c.id));
  res.json({ total, page, pages: Math.max(1, Math.ceil(total / limit)), categories: cats.map(c => c.category), items: rows.map(({ _count, ...c }) => ({ ...c, lessonCount: _count.lessons, students: _count.purchases, ...(ratings.get(c.id) || { rating: 0, reviewCount: 0 }) })) });
});

r.get('/courses/:slug', optionalAuth, async (req: AuthRequest, res) => {
  const c = await prisma.course.findFirst({ where: { slug: req.params.slug, published: true }, include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, isPreview: true, order: true } }, reviews: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true } } } }, _count: { select: { purchases: { where: { status: 'SUCCESSFUL' } } } } } });
  if (!c) return res.status(404).json({ error: 'Course not found' });
  const rt = (await ratingMap([c.id])).get(c.id) || { rating: 0, reviewCount: 0 };
  const uid = req.user?.id;
  const wish = uid ? await prisma.wishlistItem.findUnique({ where: { userId_courseId: { userId: uid, courseId: c.id } } }) : null;
  const { _count, ...rest } = c;
  res.json({ ...rest, students: _count.purchases, ...rt, entitled: uid ? await owns(uid, c.id) : false, wishlisted: Boolean(wish) });
});

r.get('/my-courses', auth, async (req: AuthRequest, res) => res.json(await myCourses(req.user!.id)));
r.get('/courses/:courseId/progress', auth, async (req: AuthRequest, res) => res.json(await prisma.courseProgress.findMany({ where: { userId: req.user!.id, lesson: { courseId: req.params.courseId } } })));

r.get('/wishlist', auth, async (req: AuthRequest, res) => res.json((await prisma.wishlistItem.findMany({ where: { userId: req.user!.id }, include: { course: true }, orderBy: { createdAt: 'desc' } })).map(w => w.course)));
r.post('/courses/:courseId/wishlist', auth, async (req: AuthRequest, res) => {
  const where = { userId_courseId: { userId: req.user!.id, courseId: req.params.courseId } };
  if (await prisma.wishlistItem.findUnique({ where })) { await prisma.wishlistItem.delete({ where }); return res.json({ wishlisted: false }); }
  if (!(await prisma.course.findUnique({ where: { id: req.params.courseId } }))) return res.status(404).json({ error: 'Course not found' });
  await prisma.wishlistItem.create({ data: { userId: req.user!.id, courseId: req.params.courseId } }); res.json({ wishlisted: true });
});

// Entitlement is re-checked every time; the video itself is served by Cloudflare R2 through a 10-minute signed URL.
r.get('/lessons/:lessonId/stream', auth, async (req: AuthRequest, res) => {
  const l = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
  if (!l) return res.status(404).json({ error: 'Lesson not found' });
  if (!l.isPreview && !(await owns(req.user!.id, l.courseId))) return res.status(403).json({ error: 'Purchase required' });
  if (!l.videoKey) return res.status(404).json({ error: 'This lesson video has not been uploaded yet.' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Video storage is not configured.' });
  res.json({ url: await signedGet(l.videoKey, { ttl: 600 }), expiresIn: 600 });
});

r.post('/lessons/:lessonId/progress', auth, async (req: AuthRequest, res) => {
  const p = z.object({ completed: z.boolean().optional(), watchedSeconds: z.number().min(0).max(86400 * 3).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid progress' });
  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (!lesson.isPreview && !(await owns(req.user!.id, lesson.courseId))) return res.status(403).json({ error: 'Course purchase required' });
  const data = { completed: Boolean(p.data.completed), watchedSeconds: Math.floor(p.data.watchedSeconds || 0) };
  res.json(await prisma.courseProgress.upsert({ where: { userId_lessonId: { userId: req.user!.id, lessonId: lesson.id } }, update: data, create: { userId: req.user!.id, lessonId: lesson.id, ...data } }));
});

r.post('/courses/:courseId/reviews', auth, async (req: AuthRequest, res) => {
  const p = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(3).max(1000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Rating 1-5 and a short comment are required' });
  if (!(await owns(req.user!.id, req.params.courseId))) return res.status(403).json({ error: 'Only students can review a course' });
  const key = { userId_courseId: { userId: req.user!.id, courseId: req.params.courseId } };
  res.status(201).json(await prisma.review.upsert({ where: key, update: p.data, create: { userId: req.user!.id, courseId: req.params.courseId, ...p.data } }));
});

r.post('/courses/:courseId/certificate', auth, async (req: AuthRequest, res) => {
  const c = await prisma.course.findUnique({ where: { id: req.params.courseId }, include: { lessons: true } });
  if (!c || !c.certificateEligible || c.lessons.length === 0) return res.status(404).json({ error: 'Certificate unavailable' });
  if (!(await owns(req.user!.id, c.id))) return res.status(403).json({ error: 'Purchase required' });
  const done = await prisma.courseProgress.count({ where: { userId: req.user!.id, completed: true, lesson: { courseId: c.id } } });
  if (done < c.lessons.length) return res.status(400).json({ error: 'Complete every lesson first' });
  const existing = await prisma.certificate.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: c.id } } });
  if (existing) return res.json(existing);
  const cert = await prisma.certificate.create({ data: { userId: req.user!.id, courseId: c.id, certificateId: `DWH-${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`, verificationToken: crypto.randomUUID() } });
  await prisma.notification.create({ data: { userId: req.user!.id, title: 'Certificate earned', body: `You completed ${c.title}.` } });
  res.status(201).json(cert);
});

export default r;
