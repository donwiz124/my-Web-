'use client';
import { Ic } from '../../components/Icon';
import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Loading } from '../../components/ui';

const ITEMS: [string, string, string][] = [['grid', 'Dashboard', '/dashboard'], ['book', 'My Courses', '/dashboard/courses'], ['award', 'Certificates', '/dashboard/certificates'], ['save', 'Saved Prompts', '/dashboard/prompts'], ['bolt', 'AI Credits', '/dashboard/credits'], ['card', 'Transactions', '/dashboard/transactions'], ['link', 'Referrals', '/dashboard/referrals'], ['dollar', 'Earnings', '/dashboard/earnings'], ['users', 'Community', '/community'], ['gear', 'Settings', '/dashboard/settings']];
export default function DashLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth(), path = usePathname(), router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace(`/login?next=${path}`); }, [loading, user, router, path]);
  if (!user) return <main className="wrap"><Loading /></main>;
  return <main className="wrap"><div className="app">
    <nav className="side"><div className="row" style={{ padding: 10 }}><div className="av">{user.name[0]}</div><div><div className="small muted">Welcome back,</div><b>{user.name.split(' ')[0]}</b><div className="small muted">{user.membership}</div></div></div>
      {ITEMS.map(([i, t, h]) => <Link key={h} href={h} className={path === h ? 'on' : ''}><Ic n={i} s={16} /> {t}</Link>)}</nav>
    <section style={{ minWidth: 0 }}>{!user.emailVerified && <VerifyBanner />}{children}</section></div></main>;
}
function VerifyBanner() {
  const send = async () => { const { api } = await import('../../lib/api'); await api('/auth/resend-verification', { method: 'POST' }); alert('Verification email sent.'); };
  return <div className="card row between" style={{ marginBottom: 16, borderLeft: '3px solid var(--warn)' }}><span className="small">Please verify your email address.</span><button className="btn sm" onClick={send}>Resend email</button></div>;
}
