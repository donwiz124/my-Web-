import { prisma } from './prisma.js';

export async function ratingMap(courseIds: string[]) {
  const rows = await prisma.review.groupBy({ by: ['courseId'], where: { courseId: { in: courseIds } }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(rows.map(r => [r.courseId, { rating: Math.round((r._avg.rating || 0) * 10) / 10, reviewCount: r._count._all }]));
}

export async function myCourses(userId: string) {
  const purchases = await prisma.coursePurchase.findMany({ where: { userId, status: 'SUCCESSFUL' }, include: { course: { include: { lessons: { select: { id: true } } } } }, orderBy: { createdAt: 'desc' } });
  const done = await prisma.courseProgress.findMany({ where: { userId, completed: true }, select: { lesson: { select: { courseId: true } } } });
  const doneBy = new Map<string, number>(); for (const d of done) doneBy.set(d.lesson.courseId, (doneBy.get(d.lesson.courseId) || 0) + 1);
  return purchases.map(p => {
    const total = p.course.lessons.length, completed = doneBy.get(p.courseId) || 0;
    const { lessons, ...course } = p.course;
    return { ...course, totalLessons: total, completedLessons: completed, percent: total ? Math.round(completed / total * 100) : 0 };
  });
}
