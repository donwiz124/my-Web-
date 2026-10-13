'use client';
import { Ic } from './Icon';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, API_BASE } from '../lib/api';
import { money, hours, level } from '../lib/format';
import { useCart } from '../lib/hooks';

export function Logo({ foot }: { foot?: boolean }) {
  return <Link href="/" className="logo"><span className="mark">DH</span><span><b>DONWIZ HANDSOME</b><small>DIGITAL SKILL HUB</small></span></Link>;
}

const COVERS: Record<string, [string, string, string]> = {
  ai: ['#ff6b35', '#6a1b9a', 'image'], video: ['#0ea5e9', '#312e81', 'video'], prompt: ['#22d3ee', '#1e3a8a', 'terminal'], music: ['#d946ef', '#4c1d95', 'music'], design: ['#ef4444', '#7f1d1d', 'pen'], content: ['#f59e0b', '#1e3a8a', 'phone'],
  PROMPT: ['#10b981', '#064e3b', 'cpu'], TEMPLATE: ['#8b5cf6', '#1e1b4b', 'layout'], EBOOK: ['#f97316', '#7c2d12', 'book'], DESIGN: ['#ec4899', '#500724', 'palette'], VIDEO: ['#3b82f6', '#172554', 'film'],
  IMAGE: ['#8b5cf6', '#1e1b4b', 'image'], UGC: ['#f43f5e', '#4c0519', 'camera'], SOCIAL: ['#06b6d4', '#083344', 'chat'], MARKETING: ['#f59e0b', '#451a03', 'megaphone'], BUSINESS: ['#22c55e', '#052e16', 'briefcase'], COPY: ['#6366f1', '#1e1b4b', 'pen'],
};
export function Cover({ kind, big, children }: { kind: string; big?: boolean; children?: ReactNode }) {
  const [a, b, e] = COVERS[kind] || COVERS.ai;
  return <div className={`cover${big ? ' big' : ''}`} style={{ background: `linear-gradient(135deg,${a},${b})` }}><span><Ic n={e} s={big ? 64 : 44} /></span>{children}</div>;
}
export const Stars = ({ n }: { n: number }) => <span className="stars">{[0, 1, 2, 3, 4].map(i => <Ic key={i} n="star" s={13} fill={i < Math.round(n)} />)}</span>;

/** Starts a real payment: the server prices the order, we redirect to the provider. */
export function CheckoutButton({ order, label, className = 'btn primary', disabled }: { order: any; label: string; className?: string; disabled?: boolean }) {
  const router = useRouter();
  const [providers, setProviders] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (provider: string) => {
    setBusy(true); setErr('');
    try { const r = await api<{ url: string }>('/payments/initialize', { method: 'POST', json: { provider, order } }); window.location.href = r.url; }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const click = async () => {
    if (!getToken()) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    setErr('');
    try {
      const p = providers ?? await api<string[]>('/payments/providers'); setProviders(p);
      if (!p.length) return setErr('Payments are not configured yet.');
      if (p.length === 1) go(p[0]);
    } catch (e: any) { setErr(e.message); }
  };
  return <>
    <button className={className} onClick={click} disabled={busy || disabled}>{busy ? 'Redirecting…' : label}</button>
    {providers && providers.length > 1 && !busy && <div className="modal-bg" onClick={() => setProviders(null)}><div className="card modal" onClick={e => e.stopPropagation()}><h3>Choose how to pay</h3><div className="grid" style={{ marginTop: 14 }}>{providers.map(p => <button key={p} className="btn" onClick={() => go(p)}>Pay with {p[0].toUpperCase() + p.slice(1)}</button>)}</div></div></div>}
    {err && <p className="err">{err}</p>}
  </>;
}

export function CourseCard({ c, onWish }: { c: any; onWish?: () => void }) {
  const router = useRouter();
  const wish = async () => {
    if (!getToken()) return router.push('/login');
    const r = await api('/learning/courses/' + c.id + '/wishlist', { method: 'POST' }).catch(() => null);
    if (r) alert(r.wishlisted ? 'Added to your wishlist' : 'Removed from wishlist');
  };
  return <div className="cc">
    <Link href={`/courses/${c.slug}`}><Cover kind={c.cover}>{c.cover === 'video' && <i className="play"><Ic n="play" s={22} fill /></i>}</Cover></Link>
    <h3><Link href={`/courses/${c.slug}`}>{c.title}</Link></h3>
    <div className="row"><span className={`pill lv-${c.level}`}>{level(c.level)}</span><span className="small muted">{c.lessonCount} Lessons · {hours(c.durationMinutes)}</span></div>
    <div className="small"><Stars n={c.rating} /> <span className="muted">{c.rating ? `${c.rating} (${c.reviewCount})` : 'New'}</span></div>
    <div className="row between"><span className="price">{money(c.price)}</span></div>
    <div className="row"><div className="grow"><CheckoutButton order={{ type: 'COURSE', courseId: c.id }} label="Buy Now" className="btn primary sm block" /></div><button className="btn sm" onClick={wish}><Ic n="heart" s={14} /> Wishlist</button></div>
  </div>;
}

const TYPE_LABEL: Record<string, string> = { PROMPT: 'AI Prompts', TEMPLATE: 'Templates', EBOOK: 'E-books', DESIGN: 'Design Resources', VIDEO: 'Video Templates' };
export const typeLabel = (t: string) => TYPE_LABEL[t] || t;
export function ProductCard({ p }: { p: any }) {
  const cart = useCart(); const inCart = cart.items.some(i => i.id === p.id);
  return <div className="cc"><Cover kind={p.type} /><h3>{p.title}</h3><span className="small muted">{typeLabel(p.type)}</span><div className="price">{money(p.price)}</div>
    <button className="btn primary sm block" onClick={() => cart.add({ id: p.id, title: p.title, price: p.price, type: p.type })} disabled={inCart}>{inCart ? <><Ic n="check" s={14} /> In cart</> : <><Ic n="cart" s={14} /> Add to Cart</>}</button></div>;
}

export function Loading({ what = 'Loading…' }: { what?: string }) { return <p className="muted" style={{ padding: 30 }}>{what}</p>; }
export function ErrorBox({ msg }: { msg: string }) { return <div className="empty" style={{ color: 'var(--bad)' }}>{msg}</div>; }

export function GoogleButton({ next, refCode, label = 'Continue with Google' }: { next?: string | null; refCode?: string | null; label?: string }) {
  const q = new URLSearchParams({ ...(next ? { next } : {}), ...(refCode ? { ref: refCode } : {}) }).toString();
  return <a className="btn block" style={{ gap: 10 }} href={`${API_BASE}/api/auth/google${q ? `?${q}` : ''}`}>
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>{label}</a>;
}
