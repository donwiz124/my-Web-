'use client';
import { useState } from 'react';
import { useApi } from '../../../lib/hooks';
import { money2, date } from '../../../lib/format';
import { Loading } from '../../../components/ui';

export default function Referrals() {
  const { data } = useApi<any>('/referrals/me'); const [c, setC] = useState(false);
  if (!data) return <Loading />;
  return <div><h2>Referrals</h2><p className="muted">Earn {data.rate}% commission on every purchase your referrals make.</p>
    <div className="card" style={{ margin: '14px 0' }}><label className="f" style={{ marginTop: 0 }}>Your referral link</label><div className="row"><input className="input grow" readOnly value={data.link} /><button className="btn primary" onClick={() => { navigator.clipboard.writeText(data.link); setC(true); }}>{c ? 'Copied' : 'Copy'}</button></div><p className="small muted" style={{ marginTop: 8 }}>Code: <b>{data.code}</b> · {data.count} referred · {money2(data.balance.earned)} earned</p></div>
    <div className="card scroll-x"><table className="t"><thead><tr><th>Member</th><th>Joined</th><th>You earned</th></tr></thead><tbody>{data.referrals.map((r: any, i: number) => <tr key={i}><td>{r.name}</td><td>{date(r.joinedAt)}</td><td>{money2(r.earned)}</td></tr>)}{!data.referrals.length && <tr><td colSpan={3} className="muted">No referrals yet — share your link!</td></tr>}</tbody></table></div></div>;
}
