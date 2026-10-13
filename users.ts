import { prisma } from './prisma.js';
import { getSettings } from './config.js';

/** Single place that creates an account: welcome credits, referral link and welcome notification. */
export async function createUser(o: { name: string; email: string; passwordHash: string; ref?: string; emailVerified?: boolean }) {
  const s = await getSettings();
  const user = await prisma.user.create({ data: { name: o.name, email: o.email, passwordHash: o.passwordHash, emailVerified: Boolean(o.emailVerified), creditBalance: s.SIGNUP_CREDITS } });
  if (s.SIGNUP_CREDITS > 0) await prisma.creditTransaction.create({ data: { userId: user.id, amount: s.SIGNUP_CREDITS, reason: 'Welcome bonus', balanceAfter: s.SIGNUP_CREDITS } });
  if (o.ref?.startsWith('DONWIZ-')) {
    const suffix = o.ref.slice(7).toLowerCase();
    const referrer = suffix.length === 8 ? await prisma.user.findFirst({ where: { id: { endsWith: suffix } } }) : null;
    if (referrer && referrer.id !== user.id) await prisma.referral.create({ data: { referrerId: referrer.id, referredUserId: user.id, commissionRate: s.REFERRAL_RATE } });
  }
  await prisma.notification.create({ data: { userId: user.id, title: 'Welcome to DONWIZ HANDSOME', body: 'Start with a course or try an AI tool with your welcome credits.' } });
  return user;
}
