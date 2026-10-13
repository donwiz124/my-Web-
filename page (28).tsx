'use client';
import { Ic } from '../../../components/Icon';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';
import { Cover, Loading, typeLabel } from '../../../components/ui';

export default function MyCourses() {
  const { data, loading } = useApi<any[]>('/learning/my-courses'); const lib = useApi<any[]>('/marketplace/library'); const wish = useApi<any[]>('/learning/wishlist');
  const download = async (p: any) => { try { const r = await api(`/marketplace/products/${p.id}/download`); window.location.href = r.url; } catch (e: any) { alert(e.message); } };
  return <div><h2>My Courses</h2>{loading ? <Loading /> : !data!.length ? <div className="empty" style={{ marginTop: 12 }}>You haven&apos;t purchased a course yet. <Link href="/courses" style={{ textDecoration: 'underline' }}>Browse courses</Link></div> : data!.map(c => <div className="card row" key={c.id} style={{ marginTop: 12 }}><div style={{ width: 110 }}><Cover kind={c.cover} /></div><div className="grow"><b>{c.title}</b><div className="prog" style={{ margin: '8px 0' }}><i style={{ width: `${c.percent}%` }} /></div><span className="small muted">{c.completedLessons}/{c.totalLessons} lessons · {c.percent}%</span></div><Link className="btn primary sm" href={`/learn/${c.slug}`}>Continue Learning</Link></div>)}
    <h2 style={{ marginTop: 30 }}>My Library</h2>{!lib.data?.length ? <p className="muted small" style={{ marginTop: 8 }}>Marketplace purchases will appear here.</p> : <div className="grid g3" style={{ marginTop: 12 }}>{lib.data.map(p => <div className="card" key={p.id}><b>{p.title}</b><p className="small muted">{typeLabel(p.type)}</p><button className="btn sm primary" style={{ marginTop: 8 }} onClick={() => download(p)}><Ic n="download" s={14} /> Download</button></div>)}</div>}
    <h2 style={{ marginTop: 30 }}>Wishlist</h2>{!wish.data?.length ? <p className="muted small" style={{ marginTop: 8 }}>Courses you save for later appear here.</p> : <div className="grid g3" style={{ marginTop: 12 }}>{wish.data.map(c => <Link key={c.id} href={`/courses/${c.slug}`} className="card"><b>{c.title}</b></Link>)}</div>}</div>;
}
