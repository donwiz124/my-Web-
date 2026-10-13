'use client';
import { Ic } from '../../components/Icon';
import Link from 'next/link';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { money2, ago } from '../../lib/format';
import { Cover, Loading, ErrorBox } from '../../components/ui';

export default function Overview() {
  const { data, loading, error, reload } = useApi<any>('/account/dashboard');
  if (loading && !data) return <Loading />; if (error) return <ErrorBox msg={error} />;
  const s = data.stats;
  const cards = [['book', 'Courses Purchased', s.coursesPurchased], ['checkcircle', 'Completed', s.completed], ['clock', 'In Progress', s.inProgress], ['bolt', 'AI Credits', s.credits], ['dollar', 'Referral Earnings', money2(s.referralEarnings)]];
  return <div>
    <div className="grid g3">{cards.slice(0, 3).map(([i, t, v]) => <div className="card stat" key={t as string}><div className="ic"><Ic n={i as string} s={20} /></div><div><small>{t}</small><b>{v}</b></div></div>)}</div>
    <div className="grid g2" style={{ marginTop: 18 }}>{cards.slice(3).map(([i, t, v]) => <div className="card stat" key={t as string}><div className="ic"><Ic n={i as string} s={20} /></div><div className="grow"><small>{t}</small><b>{v}</b></div>{t === 'AI Credits' && <Link href="/dashboard/credits" className="btn sm primary">Buy More Credits</Link>}</div>)}</div>
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', marginTop: 18, alignItems: 'start' }}>
      <div><div className="row between"><h3>My Courses</h3><Link href="/dashboard/courses" className="small muted">View All</Link></div>
        {!data.courses.length ? <div className="empty" style={{ marginTop: 10 }}>No courses yet. <Link href="/courses" style={{ textDecoration: 'underline' }}>Browse courses</Link></div> : data.courses.map((c: any) => <div className="card row" key={c.id} style={{ marginTop: 10 }}><div style={{ width: 90 }}><Cover kind={c.cover} /></div><div className="grow"><b>{c.title}</b><div className="prog" style={{ margin: '8px 0' }}><i style={{ width: `${c.percent}%` }} /></div><span className="small muted">{c.completedLessons}/{c.totalLessons} lessons · {c.percent}%</span></div><Link className="btn sm primary" href={`/learn/${c.slug}`}>Continue Learning</Link></div>)}</div>
      <div><div className="row between"><h3>Recent Activity</h3><button className="small muted" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={async () => { await api('/platform/notifications/read-all', { method: 'PATCH' }); reload(); }}>Mark all read</button></div>
        <div className="card" style={{ marginTop: 10 }}>{data.notifications.length ? data.notifications.map((n: any) => <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #ffffff10', opacity: n.read ? .65 : 1 }}><b className="small">{n.title}</b><p className="small muted">{n.body}</p><span className="small muted">{ago(n.createdAt)}</span></div>) : <p className="muted small">Nothing yet.</p>}</div></div>
    </div></div>;
}
