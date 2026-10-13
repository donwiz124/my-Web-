'use client';
import { Ic } from '../../../components/Icon';
import { useApi } from '../../../lib/hooks';
import { useAuth } from '../../../lib/auth';
import { money, date } from '../../../lib/format';
import { CheckoutButton } from '../../../components/ui';

export default function Credits() {
  const { user } = useAuth(); const packs = useApi<any[]>('/credits/packs'); const hist = useApi<any[]>('/credits/history');
  return <div><h2>AI Credits</h2><div className="card stat" style={{ margin: '12px 0' }}><div className="ic"><Ic n="bolt" s={20} /></div><div><small>Available balance</small><b>{user?.creditBalance ?? 0}</b></div></div>
    <h3>Buy credits</h3><div className="grid g3" style={{ marginTop: 10 }}>{(packs.data || []).map(p => <div className="card center" key={p.credits}><b style={{ fontSize: '1.6rem' }}>{p.credits}</b><p className="muted small">credits</p><p style={{ margin: '8px 0' }}><b>{money(p.price)}</b></p><CheckoutButton order={{ type: 'CREDITS', pack: p.credits }} label="Buy" className="btn primary sm block" /></div>)}</div>
    <h3 style={{ marginTop: 26 }}>History</h3><div className="card scroll-x" style={{ marginTop: 10 }}><table className="t"><tbody>{(hist.data || []).map(h => <tr key={h.id}><td>{date(h.createdAt)}</td><td>{h.reason}</td><td style={{ color: h.amount > 0 ? 'var(--ok)' : 'var(--bad)' }}>{h.amount > 0 ? '+' : ''}{h.amount}</td><td className="muted">bal {h.balanceAfter}</td></tr>)}{!hist.data?.length && <tr><td className="muted">No activity yet.</td></tr>}</tbody></table></div></div>;
}
