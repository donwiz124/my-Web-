'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';
import { useAuth } from '../../../lib/auth';
import { Loading } from '../../../components/ui';

export default function Tool() {
  const { slug } = useParams<{ slug: string }>(), router = useRouter(), { refresh } = useAuth();
  const { data: tools } = useApi<any[]>('/ai-tools');
  const tool = tools?.find(t => t.slug === slug);
  const [input, setInput] = useState(''), [out, setOut] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  if (!tools) return <main className="wrap"><Loading /></main>;
  if (!tool) return <main className="wrap section"><p className="err">Tool not found.</p></main>;
  const run = async () => {
    if (!getToken()) return router.push(`/login?next=/ai-tools/${slug}`);
    setBusy(true); setErr(''); setOut(''); setSaved(false);
    try { const r = await api(`/ai-tools/${slug}/generate`, { method: 'POST', json: { input } }); setOut(r.output); refresh(); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const save = async () => { await api('/ai-tools/prompts/save', { method: 'POST', json: { title: tool.name, prompt: out } }); setSaved(true); };
  return <main className="wrap section">
    <Link href="/ai-tools" className="muted small">All tools</Link>
    <h1 className="h-title" style={{ marginTop: 8 }}>{tool.name}</h1><p className="h-sub">{tool.description} · <b>{tool.creditCost}</b> credit{tool.creditCost === 1 ? '' : 's'} per use{tool.premium ? ' · Pro/Business' : ''}</p>
    <div className="grid g2" style={{ marginTop: 20 }}>
      <div className="card"><label className="f">What do you need?</label><textarea className="textarea" style={{ minHeight: 200 }} value={input} onChange={e => setInput(e.target.value)} placeholder="Describe your topic, product or goal…" /><button className="btn primary" style={{ marginTop: 12 }} onClick={run} disabled={busy || input.trim().length < 3}>{busy ? 'Generating…' : `Generate (${tool.creditCost} credits)`}</button>{err && <p className="err">{err} {err.includes('membership') && <Link href="/pricing" style={{ textDecoration: 'underline' }}>View plans</Link>}{err.includes('credits') && <Link href="/dashboard/credits" style={{ textDecoration: 'underline' }}> Buy credits</Link>}</p>}</div>
      <div className="card"><div className="row between"><h3>Result</h3>{out && <div className="row"><button className="btn sm" onClick={() => navigator.clipboard.writeText(out)}>Copy</button><button className="btn sm" onClick={save} disabled={saved}>{saved ? 'Saved' : 'Save'}</button></div>}</div><p style={{ whiteSpace: 'pre-wrap', marginTop: 12, lineHeight: 1.7 }} className={out ? '' : 'muted'}>{out || 'Your result will appear here.'}</p></div>
    </div>
  </main>;
}
