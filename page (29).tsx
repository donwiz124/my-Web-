'use client';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';
import { date } from '../../../lib/format';
import { Loading } from '../../../components/ui';

export default function Prompts() {
  const { data, loading, reload } = useApi<any[]>('/ai-tools/prompts/saved');
  return <div><h2>Saved Prompts</h2>{loading ? <Loading /> : !data!.length ? <div className="empty" style={{ marginTop: 12 }}>Save results from any AI tool and they&apos;ll show up here.</div> : data!.map(p => <div className="card" key={p.id} style={{ marginTop: 12 }}><div className="row between"><b>{p.title}</b><span className="small muted">{date(p.createdAt)}</span></div><p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }} className="small muted">{p.prompt}</p><div className="row"><button className="btn sm" onClick={() => navigator.clipboard.writeText(p.prompt)}>Copy</button><button className="btn sm danger" onClick={async () => { await api(`/ai-tools/prompts/${p.id}`, { method: 'DELETE' }); reload(); }}>Delete</button></div></div>)}</div>;
}
