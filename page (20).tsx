'use client';
import { Ic } from '../../../components/Icon';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';
import { Loading, ErrorBox } from '../../../components/ui';

export default function Learn() {
  const { slug } = useParams<{ slug: string }>();
  const { data: c, error } = useApi<any>(`/learning/courses/${slug}`);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [cur, setCur] = useState<any>(null), [url, setUrl] = useState(''), [vErr, setVErr] = useState(''), [cert, setCert] = useState<any>(null), [msg, setMsg] = useState('');
  useEffect(() => { if (c) { setCur(c.lessons[0]); api(`/learning/courses/${c.id}/progress`).then((p: any[]) => setDone(new Set(p.filter(x => x.completed).map(x => x.lessonId)))).catch(() => {}); } }, [c]);
  useEffect(() => {
    if (!cur) return; setUrl(''); setVErr('');
    api(`/learning/lessons/${cur.id}/stream`).then(r => setUrl(r.url)).catch(e => setVErr(e.message));
  }, [cur]);
  if (error) return <main className="wrap section"><ErrorBox msg={error} /></main>;
  if (!c) return <main className="wrap"><Loading /></main>;
  const pct = Math.round(done.size / Math.max(1, c.lessons.length) * 100);
  const mark = async () => { await api(`/learning/lessons/${cur.id}/progress`, { method: 'POST', json: { completed: true } }); const n = new Set(done); n.add(cur.id); setDone(n); const i = c.lessons.findIndex((l: any) => l.id === cur.id); if (c.lessons[i + 1] && (c.lessons[i + 1].isPreview || c.entitled)) setCur(c.lessons[i + 1]); };
  const claim = async () => { try { setCert(await api(`/learning/courses/${c.id}/certificate`, { method: 'POST' })); } catch (e: any) { setMsg(e.message); } };
  return <main className="wrap section">
    <Link href={`/courses/${c.slug}`} className="muted small">Back to {c.title}</Link>
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', marginTop: 12, alignItems: 'start' }}>
      <div>
        <div className="video">{vErr ? <p className="muted" style={{ padding: 20, textAlign: 'center' }}>{vErr}</p> : url ? <video key={url} src={url} controls controlsList="nodownload" onError={() => setVErr('This lesson video has not been uploaded yet.')} /> : <span className="muted">Loading video…</span>}</div>
        <h2 style={{ marginTop: 16 }}>{cur?.order}. {cur?.title}</h2>
        <div className="row" style={{ marginTop: 12 }}><button className="btn primary" onClick={mark} disabled={!cur || done.has(cur.id)}>{cur && done.has(cur.id) ? <><Ic n="check" s={14} /> Completed</> : 'Mark lesson complete'}</button></div>
      </div>
      <aside className="card"><div className="row between"><h3>Curriculum</h3><span className="small muted">{pct}%</span></div><div className="prog" style={{ margin: '10px 0' }}><i style={{ width: `${pct}%` }} /></div>
        {c.lessons.map((l: any) => { const ok = l.isPreview || c.entitled; return <button key={l.id} disabled={!ok} onClick={() => setCur(l)} className="btn block" style={{ justifyContent: 'space-between', marginBottom: 6, borderColor: cur?.id === l.id ? 'var(--blue)' : undefined }}><span>{l.order}. {l.title}</span><span>{done.has(l.id) ? <Ic n="check" s={14} /> : ok ? null : <Ic n="lock" s={14} />}</span></button>; })}
        {pct === 100 && c.certificateEligible && !cert && <button className="btn primary block" onClick={claim}><Ic n="award" s={16} /> Get certificate</button>}
        {cert && <Link className="btn primary block" href={`/verify/${cert.verificationToken}`}>View certificate {cert.certificateId}</Link>}{msg && <p className="err">{msg}</p>}</aside>
    </div>
  </main>;
}
