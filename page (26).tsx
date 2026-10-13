'use client';
import { useState } from 'react';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';
import { money2, date } from '../../../lib/format';
import { Loading } from '../../../components/ui';

export default function Earnings() {
  const { data, reload } = useApi<any>('/referrals/withdrawals'); const [amt, setAmt] = useState(''), [det, setDet] = useState(''), [msg, setMsg] = useState(''), [bad, setBad] = useState(false);
  if (!data) return <Loading />;
  const submit = async () => { try { await api('/referrals/withdrawals', { method: 'POST', json: { amount: Math.round(parseFloat(amt) * 100), payoutDetails: det } }); setMsg('Withdrawal requested.'); setBad(false); setAmt(''); reload(); } catch (e: any) { setMsg(e.message); setBad(true); } };
  return <div><h2>Earnings</h2><div className="grid g3" style={{ margin: '12px 0' }}>{[['Total earned', data.balance.earned], ['Withdrawn / pending', data.balance.withdrawnOrPending], ['Available', data.balance.available]].map(([t, v]) => <div key={t as string} className="card stat"><div><small>{t}</small><b>{money2(v as number)}</b></div></div>)}</div>
    <div className="card"><h3>Request withdrawal</h3><div className="grid g2"><div><label className="f">Amount (USD)</label><input className="input" type="number" step="0.01" min="0" value={amt} onChange={e => setAmt(e.target.value)} /></div><div><label className="f">Payout details (bank name, account no., name)</label><input className="input" value={det} onChange={e => setDet(e.target.value)} /></div></div><button className="btn primary" style={{ marginTop: 12 }} onClick={submit} disabled={!amt || det.length < 8}>Request</button>{msg && <p className={bad ? 'err' : 'okmsg'}>{msg}</p>}</div>
    <div className="card scroll-x" style={{ marginTop: 16 }}><table className="t"><thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.items.map((w: any) => <tr key={w.id}><td>{date(w.createdAt)}</td><td>{money2(w.amount)}</td><td><span className={`pill ${w.status === 'PAID' ? 'ok' : w.status === 'REJECTED' ? 'bad' : 'warn'}`}>{w.status}</span></td></tr>)}{!data.items.length && <tr><td colSpan={3} className="muted">No withdrawals yet.</td></tr>}</tbody></table></div></div>;
}
