import crypto from 'node:crypto';
import type { Transaction } from '@prisma/client';

export type Provider = 'paystack' | 'flutterwave' | 'stripe';
export const PROVIDERS: Provider[] = ['paystack', 'flutterwave', 'stripe'];
export const chargeCurrency = (p: Provider) => (p === 'stripe' ? 'USD' : process.env.LOCAL_CURRENCY || 'NGN');
/** USD cents -> minor units of the charge currency. */
export const toChargeMinor = (p: Provider, usdCents: number, ngnPerUsd: number) => (p === 'stripe' ? usdCents : Math.round(usdCents * ngnPerUsd));

const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} is not configured`); return v; };
const KEYS: Record<Provider, string> = { paystack: 'PAYSTACK_SECRET_KEY', flutterwave: 'FLW_SECRET_KEY', stripe: 'STRIPE_SECRET_KEY' };
export const enabledProviders = () => PROVIDERS.filter(p => Boolean(process.env[KEYS[p]]));

export async function initializeCharge(p: Provider, o: { reference: string; email: string; minor: number; currency: string; title: string; redirectUrl: string }) {
  if (p === 'paystack') {
    const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${need('PAYSTACK_SECRET_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ email: o.email, amount: o.minor, currency: o.currency, reference: o.reference, callback_url: o.redirectUrl }) });
    const j: any = await r.json(); if (!r.ok || !j.status) throw new Error(j.message || 'Paystack initialization failed');
    return { url: j.data.authorization_url as string };
  }
  if (p === 'flutterwave') {
    const r = await fetch('https://api.flutterwave.com/v3/payments', { method: 'POST', headers: { Authorization: `Bearer ${need('FLW_SECRET_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ tx_ref: o.reference, amount: o.minor / 100, currency: o.currency, redirect_url: o.redirectUrl, customer: { email: o.email }, customizations: { title: 'DONWIZ HANDSOME', description: o.title } }) });
    const j: any = await r.json(); if (!r.ok || j.status !== 'success') throw new Error(j.message || 'Flutterwave initialization failed');
    return { url: j.data.link as string };
  }
  const body = new URLSearchParams({ mode: 'payment', client_reference_id: o.reference, customer_email: o.email, success_url: `${o.redirectUrl}&session_id={CHECKOUT_SESSION_ID}`, cancel_url: o.redirectUrl.replace(/\/checkout\/verify.*/, '/pricing'), 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd', 'line_items[0][price_data][unit_amount]': String(o.minor), 'line_items[0][price_data][product_data][name]': o.title });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${need('STRIPE_SECRET_KEY')}`, 'content-type': 'application/x-www-form-urlencoded' }, body });
  const j: any = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'Stripe initialization failed');
  return { url: j.url as string, sessionId: j.id as string };
}

/** Always verifies with the provider server-side; amount, currency and reference must all match the stored order. */
export async function verifyCharge(tx: Transaction, sessionId?: string): Promise<boolean> {
  const p = tx.provider as Provider;
  if (p === 'paystack') {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(tx.providerRef)}`, { headers: { Authorization: `Bearer ${need('PAYSTACK_SECRET_KEY')}` } });
    const j: any = await r.json(); const d = j.data;
    return r.ok && j.status && d?.status === 'success' && d.currency === tx.currency && d.amount >= tx.amount && d.reference === tx.providerRef;
  }
  if (p === 'flutterwave') {
    const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx.providerRef)}`, { headers: { Authorization: `Bearer ${need('FLW_SECRET_KEY')}` } });
    const j: any = await r.json(); const d = j.data;
    return r.ok && j.status === 'success' && d?.status === 'successful' && d.currency === tx.currency && Math.round(d.amount * 100) >= tx.amount && d.tx_ref === tx.providerRef;
  }
  if (p === 'stripe') {
    const id = sessionId || (tx.metadata as any)?.sessionId; if (!id) return false;
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${need('STRIPE_SECRET_KEY')}` } });
    const d: any = await r.json();
    return r.ok && d.payment_status === 'paid' && d.currency === 'usd' && d.amount_total >= tx.amount && d.client_reference_id === tx.providerRef;
  }
  return false;
}

const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Returns the transaction reference named in a *signature-valid* webhook, else null. */
export function parseWebhook(p: Provider, raw: Buffer, headers: Record<string, any>): string | null {
  try {
    const body = JSON.parse(raw.toString('utf8'));
    if (p === 'paystack') {
      const sig = crypto.createHmac('sha512', need('PAYSTACK_SECRET_KEY')).update(raw).digest('hex');
      return safeEq(sig, String(headers['x-paystack-signature'] || '')) && body.event === 'charge.success' ? body.data?.reference : null;
    }
    if (p === 'flutterwave') {
      return safeEq(need('FLW_SECRET_HASH'), String(headers['verif-hash'] || '')) && body.data?.tx_ref ? body.data.tx_ref : null;
    }
    const parts = Object.fromEntries(String(headers['stripe-signature'] || '').split(',').map(x => x.split('=') as [string, string]));
    const sig = crypto.createHmac('sha256', need('STRIPE_WEBHOOK_SECRET')).update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');
    const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
    return fresh && safeEq(sig, parts.v1 || '') && body.type === 'checkout.session.completed' ? body.data.object.client_reference_id : null;
  } catch { return null; }
}
