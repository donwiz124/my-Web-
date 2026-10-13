import { Router } from 'express';
import { prisma } from '../services/prisma.js';

const r = Router();
r.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.json({ courses: [], products: [], jobs: [] });
  const m = { contains: q, mode: 'insensitive' as const };
  const [courses, products, jobs] = await Promise.all([
    prisma.course.findMany({ where: { published: true, OR: [{ title: m }, { description: m }] }, take: 10, select: { title: true, slug: true, category: true, price: true } }),
    prisma.product.findMany({ where: { published: true, OR: [{ title: m }, { description: m }] }, take: 10, select: { title: true, slug: true, price: true, type: true } }),
    prisma.job.findMany({ where: { published: true, OR: [{ title: m }, { company: m }] }, take: 10, select: { title: true, company: true, id: true, remote: true } }),
  ]);
  res.json({ courses, products, jobs });
});
export default r;
