'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import Light from '../../components/Light';
import { CheckoutButton, Loading } from '../../components/ui';

const FEATURES: Record<string, string[]> = {
  FREE: ['Access to free courses', 'Limited AI tools', 'Limited AI credits', 'Community access'],
  PRO: ['More courses', 'More AI credits', 'Premium AI tools', 'Certificates', 'Premium resources'],
  BUSINESS: ['Advanced AI tools', 'Higher credit allowance', 'Business resources', 'Priority support', 'Premium courses'],
};
export default function Pricing() {
  const [iv, setIv] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY'); const { user } = useAuth();
  const { data } = useApi<any>('/platform/pricing');
  if (!data) return <Light><Loading /></Light>;
  const per = (c: number) => money(iv === 'MONTHLY' ? c : Math.round(c / 12));
  return <Light>
    <div className="center"><h1 className="h-title">Choose Your Plan</h1><p className="h-sub">Flexible plans for every stage of your journey.</p>
      <div className="toggle" style={{ marginTop: 16 }}><button className={iv === 'MONTHLY' ? 'on' : ''} onClick={() => setIv('MONTHLY')}>Monthly</button><button className={iv === 'YEARLY' ? 'on' : ''} onClick={() => setIv('YEARLY')}>Yearly (Save {data.yearlyDiscount}%)</button></div></div>
    <div className="grid g3" style={{ marginTop: 34, maxWidth: 980, marginInline: 'auto' }}>
      {(['FREE', 'PRO', 'BUSINESS'] as const).map(p => <div key={p} className={`card plan${p === 'PRO' ? ' pop' : ''}`}>{p === 'PRO' && <span className="badge">Most Popular</span>}
        <b className="small muted">{p}</b><div className="price-big">{p === 'FREE' ? '$0' : per(data.plans[p][iv] )}<span className="small muted" style={{ fontWeight: 400 }}> /month</span></div>
        {p !== 'FREE' && iv === 'YEARLY' && <p className="small muted">Billed {money(data.plans[p].YEARLY)} per year</p>}
        <ul>{FEATURES[p].map(f => <li key={f}>{f}</li>)}</ul>
        {p === 'FREE' ? <Link className="btn block" href={user ? '/dashboard' : '/register'}>Get Started</Link> : user?.membership === p ? <button className="btn block" disabled>Current plan</button> : <CheckoutButton order={{ type: 'SUBSCRIPTION', plan: p, interval: iv }} label="Get Started" className={`btn block${p === 'PRO' ? ' primary' : ''}`} />}</div>)}
    </div>
  </Light>;
}
