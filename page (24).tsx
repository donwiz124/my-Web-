'use client';
import { useApi } from '../../../lib/hooks';
import { money2, date } from '../../../lib/format';
import { Loading } from '../../../components/ui';

export default function Tx() {
  const { data, loading } = useApi<any[]>('/account/transactions');
  return <div><h2>Transactions</h2>{loading ? <Loading /> : <div className="card scroll-x" style={{ marginTop: 12 }}><table className="t"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Provider</th><th>Status</th></tr></thead><tbody>{data!.map(t => <tr key={t.id}><td>{date(t.createdAt)}</td><td>{t.type}</td><td>{money2(t.usdAmount)}</td><td>{t.provider}</td><td><span className={`pill ${t.status === 'SUCCESSFUL' ? 'ok' : t.status === 'PENDING' ? 'warn' : 'bad'}`}>{t.status}</span></td></tr>)}{!data!.length && <tr><td colSpan={5} className="muted">No transactions yet.</td></tr>}</tbody></table></div>}</div>;
}
