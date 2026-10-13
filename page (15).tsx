'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../../lib/hooks';
import { CourseCard, Loading, ErrorBox } from '../../components/ui';

export default function Courses() {
  const [q, setQ] = useState(''), [lv, setLv] = useState(''), [cat, setCat] = useState(''), [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), ...(q && { q }), ...(lv && { level: lv }), ...(cat && { category: cat }) }).toString();
  const { data, loading, error } = useApi<any>(`/learning/courses?${qs}`);
  const reset = (fn: () => void) => { fn(); setPage(1); };
  return <main className="wrap section">
    <div className="row between"><div><h1 className="h-title">All Courses</h1><p className="h-sub">Learn from expert-led courses and gain in-demand skills.</p></div><Link href="/register" className="btn primary">Start Learning</Link></div>
    <input className="input" style={{ marginTop: 18 }} placeholder="Search courses…" value={q} onChange={e => reset(() => setQ(e.target.value))} />
    <div className="chips">{[['', 'All'], ['BEGINNER', 'Beginner'], ['INTERMEDIATE', 'Intermediate'], ['ADVANCED', 'Advanced']].map(([v, t]) => <button key={t} className={`chip${lv === v ? ' on' : ''}`} onClick={() => reset(() => setLv(v))}>{t}</button>)}
      <span className="muted" style={{ margin: '0 6px' }}>|</span>{(data?.categories || []).map((c: string) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => reset(() => setCat(cat === c ? '' : c))}>{c}</button>)}</div>
    {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} /> : !data.items.length ? <div className="empty">No courses match your search.</div> :
      <div className="grid g3">{data.items.map((c: any) => <CourseCard key={c.id} c={c} />)}</div>}
    {data && data.pages > 1 && <div className="row" style={{ justifyContent: 'center', marginTop: 26 }}><button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>{Array.from({ length: data.pages }, (_, i) => <button key={i} className={`chip${page === i + 1 ? ' on' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button className="btn sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>›</button></div>}
  </main>;
}
