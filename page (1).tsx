'use client';
import { Ic } from '../../components/Icon';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { ago } from '../../lib/format';
import Light from '../../components/Light';
import { Loading, ErrorBox } from '../../components/ui';

const CATS = ['AI', 'DESIGN', 'VIDEO', 'MARKETING', 'BUSINESS', 'FREELANCING', 'GENERAL'];
const label = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();
function Post({ p, reload }: { p: any; reload: () => void }) {
  const router = useRouter(); const [open, setOpen] = useState(false), [list, setList] = useState<any[]>([]), [txt, setTxt] = useState('');
  const guard = (fn: () => Promise<any>) => async () => { if (!getToken()) return router.push('/login'); await fn().catch(e => alert(e.message)); };
  const toggle = async () => { setOpen(!open); if (!open) setList(await api(`/platform/community/${p.id}/comments`)); };
  return <div className="card post"><div className="av">{p.user.name[0]}</div><div className="grow">
    <b>{p.user.name}</b> <span className="muted small">· {label(p.category)} · {ago(p.createdAt)}</span>
    <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.body}</p>
    <div className="row small muted" style={{ marginTop: 10 }}><button className="btn sm" onClick={guard(async () => { await api(`/platform/community/${p.id}/like`, { method: 'POST' }); reload(); })}><Ic n="heart" s={14} fill={p.likedByMe} /> {p._count.likes}</button><button className="btn sm" onClick={toggle}><Ic n="chat" s={14} /> {p._count.comments}</button></div>
    {open && <div style={{ marginTop: 10 }}>{list.map(c => <p key={c.id} className="small" style={{ margin: '6px 0' }}><b>{c.user.name}</b> {c.body}</p>)}<div className="row"><input className="input grow" value={txt} onChange={e => setTxt(e.target.value)} placeholder="Write a comment" /><button className="btn primary sm" onClick={guard(async () => { await api(`/platform/community/${p.id}/comments`, { method: 'POST', json: { body: txt } }); setTxt(''); setList(await api(`/platform/community/${p.id}/comments`)); reload(); })}>Send</button></div></div>}
  </div></div>;
}
export default function Community() {
  const router = useRouter(); const [cat, setCat] = useState(''), [body, setBody] = useState(''), [pc, setPc] = useState('GENERAL'), [err, setErr] = useState('');
  const { data, loading, error, reload } = useApi<any[]>(`/platform/community${cat ? `?category=${cat}` : ''}`);
  const meta = useApi<any>('/platform/community/meta');
  const post = async () => { if (!getToken()) return router.push('/login'); try { await api('/platform/community', { method: 'POST', json: { body, category: pc } }); setBody(''); setErr(''); reload(); meta.reload(); } catch (e: any) { setErr(e.message); } };
  return <Light>
    <h1 className="h-title">Community</h1><p className="h-sub">Connect, learn and grow with like-minded people.</p>
    <div className="grid" style={{ gridTemplateColumns: '180px minmax(0,1fr) 250px', marginTop: 20, alignItems: 'start' }}>
      <div className="side" style={{ position: 'static' }}><button className={!cat ? 'on' : ''} onClick={() => setCat('')}>All</button>{CATS.map(c => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{label(c)}</button>)}</div>
      <div className="grid"><div className="card"><h3>Create Post</h3><textarea className="textarea" style={{ margin: '10px 0' }} placeholder="Share your thoughts, ask questions, or share your work…" value={body} onChange={e => setBody(e.target.value)} /><div className="row between"><select className="select" style={{ maxWidth: 160 }} value={pc} onChange={e => setPc(e.target.value)}>{CATS.map(c => <option key={c} value={c}>{label(c)}</option>)}</select><button className="btn primary" onClick={post} disabled={body.trim().length < 3}>Post</button></div>{err && <p className="err">{err}</p>}</div>
        {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : !data!.length ? <div className="empty">No posts yet — be the first to share something!</div> : data!.map(p => <Post key={p.id} p={p} reload={reload} />)}</div>
      <div className="grid"><div className="card"><h4>Trending Topics</h4>{(meta.data?.trending || []).map((t: any) => <p key={t.category} className="small" style={{ margin: '8px 0' }}># {label(t.category)} <span className="muted">· {t.posts} posts</span></p>)}{!meta.data?.trending.length && <p className="small muted">Nothing yet.</p>}</div>
        <div className="card"><h4>Top Members</h4>{(meta.data?.topUsers || []).map((u: any, i: number) => <div key={i} className="row small" style={{ margin: '8px 0' }}><div className="av" style={{ width: 28, height: 28 }}>{u.name[0]}</div><span className="grow">{u.name}</span><span className="muted">{u.posts}</span></div>)}</div></div>
    </div>
  </Light>;
}
