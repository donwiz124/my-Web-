import { prisma } from './prisma.js';

/** All money values are integer USD cents. */
export const DEFAULT_SETTINGS: Record<string, number> = {
  PRO_PRICE: 2500, BUSINESS_PRICE: 5000, YEARLY_DISCOUNT: 20,
  CREDITS_100_PRICE: 500, CREDITS_500_PRICE: 2000, CREDITS_1500_PRICE: 5000,
  REFERRAL_RATE: 20, WITHDRAWAL_MINIMUM: 1000, SIGNUP_CREDITS: 20,
  PRO_MONTHLY_CREDITS: 500, BUSINESS_MONTHLY_CREDITS: 1500, NGN_PER_USD: 1500,
};

export async function getSettings(): Promise<Record<string, number>> {
  const rows = await prisma.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) { const n = Number(r.value); if (Number.isFinite(n)) out[r.key] = n; }
  return out;
}

export const CREDIT_PACKS = [100, 500, 1500] as const;
export const planPrice = (s: Record<string, number>, plan: 'PRO' | 'BUSINESS', interval: 'MONTHLY' | 'YEARLY') => {
  const monthly = plan === 'PRO' ? s.PRO_PRICE : s.BUSINESS_PRICE;
  return interval === 'MONTHLY' ? monthly : Math.round(monthly * 12 * (100 - s.YEARLY_DISCOUNT) / 100);
};
export const randomToken = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
export const referralCode = (id: string) => `DONWIZ-${id.slice(-8).toUpperCase()}`;
