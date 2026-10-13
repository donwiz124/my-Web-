import { prisma } from './prisma.js';
import { getSettings } from './config.js';

type Meta = { plan?: 'PRO' | 'BUSINESS'; interval?: 'MONTHLY' | 'YEARLY'; courseId?: string; credits?: number; productIds?: string[]; title?: string };

/** Idempotent: the PENDING -> SUCCESSFUL claim guarantees a transaction is fulfilled exactly once. */
export async function fulfillTransaction(id: string) {
  const s = await getSettings();
  return prisma.$transaction(async db => {
    const claimed = await db.transaction.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'SUCCESSFUL' } });
    if (claimed.count === 0) return { already: true };
    const tx = await db.transaction.findUniqueOrThrow({ where: { id } });
    const m = (tx.metadata || {}) as Meta;
    const note = (userId: string, title: string, body: string) => db.notification.create({ data: { userId, title, body } });
    const addCredits = async (n: number, reason: string) => {
      const u = await db.user.update({ where: { id: tx.userId }, data: { creditBalance: { increment: n } } });
      await db.creditTransaction.create({ data: { userId: tx.userId, amount: n, reason, balanceAfter: u.creditBalance } });
    };

    if (tx.type === 'COURSE' && m.courseId) {
      await db.coursePurchase.upsert({ where: { userId_courseId: { userId: tx.userId, courseId: m.courseId } }, update: { status: 'SUCCESSFUL', amount: tx.usdAmount, transactionId: tx.id }, create: { userId: tx.userId, courseId: m.courseId, amount: tx.usdAmount, transactionId: tx.id, status: 'SUCCESSFUL' } });
      await note(tx.userId, 'Course purchased', m.title || 'Your course is ready. Start learning!');
    } else if (tx.type === 'CREDITS' && m.credits) {
      await addCredits(m.credits, `Purchased ${m.credits} credits`);
      await note(tx.userId, 'Credits added', `${m.credits} AI credits were added to your balance.`);
    } else if (tx.type === 'SUBSCRIPTION' && m.plan) {
      const now = new Date(), end = new Date(now);
      if (m.interval === 'YEARLY') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
      await db.subscription.updateMany({ where: { userId: tx.userId, status: 'ACTIVE' }, data: { status: 'REPLACED' } });
      await db.subscription.create({ data: { userId: tx.userId, plan: m.plan, amount: tx.usdAmount, currency: 'USD', status: 'ACTIVE', startsAt: now, endsAt: end, provider: tx.provider } });
      await db.user.update({ where: { id: tx.userId }, data: { membership: m.plan } });
      const bonus = (m.plan === 'PRO' ? s.PRO_MONTHLY_CREDITS : s.BUSINESS_MONTHLY_CREDITS) * (m.interval === 'YEARLY' ? 12 : 1);
      await addCredits(bonus, `${m.plan} membership credits`);
      await note(tx.userId, `${m.plan} membership active`, `Welcome to ${m.plan}! ${bonus} credits were added.`);
    } else if (tx.type === 'MARKETPLACE' && m.productIds?.length) {
      const products = await db.product.findMany({ where: { id: { in: m.productIds } } });
      for (const p of products) await db.productPurchase.upsert({ where: { userId_productId: { userId: tx.userId, productId: p.id } }, update: { status: 'SUCCESSFUL', amount: p.price, transactionId: tx.id }, create: { userId: tx.userId, productId: p.id, amount: p.price, transactionId: tx.id, status: 'SUCCESSFUL' } });
      await note(tx.userId, 'Marketplace purchase complete', `${products.length} item(s) are now in your library.`);
    }

    const ref = await db.referral.findUnique({ where: { referredUserId: tx.userId } });
    if (ref) {
      const amount = Math.floor(tx.usdAmount * ref.commissionRate / 100);
      if (amount > 0) {
        await db.referralCommission.create({ data: { referralId: ref.id, transactionId: tx.id, amount, rate: ref.commissionRate, status: 'APPROVED' } });
        await note(ref.referrerId, 'Referral commission earned', `You earned $${(amount / 100).toFixed(2)} from a referral purchase.`);
      }
    }
    return { already: false };
  });
}
