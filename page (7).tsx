'use client';
import Link from 'next/link';
import { useApi } from '../../lib/hooks';
import { Cover, Loading, ErrorBox } from '../../components/ui';

export default function Tools() {
  const { data, loading, error } = useApi<any[]>('/ai-tools');
  return <main className="wrap section">
    <h1 className="h-title">AI Tools</h1><p className="h-sub">Powerful AI tools to help you create, write, design and grow.</p>
    {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : <div className="grid g3" style={{ marginTop: 22 }}>{data!.map(t => <div className="card" key={t.id}>
      <div className="row"><div style={{ width: 54 }}><Cover kind={t.category} /></div><div><h3 style={{ fontSize: '1rem' }}>{t.name}</h3><p className="small muted">{t.description}</p></div></div>
      <div className="row between" style={{ marginTop: 14 }}><span className="pill">{t.creditCost} credit{t.creditCost === 1 ? '' : 's'}</span><Link className="btn primary sm" href={`/ai-tools/${t.slug}`}>Use Tool</Link></div></div>)}</div>}
  </main>;
}
