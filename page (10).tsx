'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { money } from '../../lib/format';

export default function Search() {
  const [q, setQ] = useState(''), [r, setR] = useState<any>(null);
  useEffect(() => { if (q.trim().length < 2) return setR(null); const t = setTimeout(() => api('/search?q=' + encodeURIComponent(q)).then(setR).catch(() => {}), 250); return () => clearTimeout(t); }, [q]);
  const Sec = ({ t, items, href, sub }: any) => items?.length ? <div className="card" style={{ marginTop: 14 }}><h3>{t}</h3>{items.map((i: any) => <p key={i.slug || i.id} style={{ margin: '8px 0' }}><Link href={href(i)}>{i.title}</Link> <span className="muted small">{sub(i)}</span></p>)}</div> : null;
  return <main className="wrap section" style={{ maxWidth: 760 }}><h1 className="h-title">Search</h1><input className="input" style={{ marginTop: 14 }} autoFocus placeholder="Search courses, products and jobs…" value={q} onChange={e => setQ(e.target.value)} />
    {r && !r.courses.length && !r.products.length && !r.jobs.length && <div className="empty" style={{ marginTop: 14 }}>Nothing found.</div>}
    <Sec t="Courses" items={r?.courses} href={(i: any) => `/courses/${i.slug}`} sub={(i: any) => money(i.price)} /><Sec t="Marketplace" items={r?.products} href={() => '/marketplace'} sub={(i: any) => money(i.price)} /><Sec t="Jobs" items={r?.jobs} href={() => '/jobs'} sub={(i: any) => i.company} /></main>;
}
