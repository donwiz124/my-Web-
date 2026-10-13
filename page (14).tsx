'use client';
import { Ic } from '../../../components/Icon';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';
import { money, level, hours, date } from '../../../lib/format';
import { Cover, CheckoutButton, Stars, Loading, ErrorBox } from '../../../components/ui';

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>(), router = useRouter();
  const { data: c, loading, error, reload } = useApi<any>(`/learning/courses/${slug}`);
  const [tab, setTab] = useState('Overview'), [rating, setRating] = useState(5), [comment, setComment] = useState(''), [msg, setMsg] = useState('');
  if (loading && !c) return <main className="wrap"><Loading /></main>;
  if (error || !c) return <main className="wrap section"><ErrorBox msg={error || 'Course not found'} /></main>;
  const wish = async () => { if (!getToken()) return router.push('/login'); await api(`/learning/courses/${c.id}/wishlist`, { method: 'POST' }); reload(); };
  const review = async () => { try { await api(`/learning/courses/${c.id}/reviews`, { method: 'POST', json: { rating, comment } }); setComment(''); setMsg('Thanks for your review!'); reload(); } catch (e: any) { setMsg(e.message); } };
  return <main className="wrap section">
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.8fr) minmax(0,1fr)', alignItems: 'start' }}>
      <div>
        <Cover kind={c.cover} big><i className="play"><Ic n="play" s={22} fill /></i></Cover>
        <h1 className="h-title" style={{ marginTop: 18 }}>{c.title}</h1>
        <p className="muted" style={{ marginTop: 6 }}>By {c.instructor}</p>
        <div className="row" style={{ marginTop: 10 }}><span className={`pill lv-${c.level}`}>{level(c.level)}</span><span className="small"><Stars n={c.rating} /> {c.rating || 'New'} ({c.reviewCount} reviews)</span><span className="small muted">{c.students} students · {c.lessons.length} lessons · {hours(c.durationMinutes)}</span></div>
        <div className="row" style={{ marginTop: 16 }}>
          <span className="price-big">{money(c.price)}</span>
          {c.entitled ? <Link href={`/learn/${c.slug}`} className="btn primary">Continue learning</Link> : <CheckoutButton order={{ type: 'COURSE', courseId: c.id }} label="Buy Course" />}
          <button className="btn" onClick={wish}><Ic n="heart" s={16} fill={c.wishlisted} /> {c.wishlisted ? 'Wishlisted' : 'Add to Wishlist'}</button>
        </div>
        <div className="tabs">{['Overview', 'Curriculum', 'Reviews', 'Requirements', 'Certificate'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
        {tab === 'Overview' && <div><h3>About This Course</h3><p className="muted" style={{ margin: '8px 0 20px' }}>{c.description}</p><h3>What You&apos;ll Learn</h3><ul style={{ lineHeight: 2, color: '#b8c7ec' }}>{c.outcomes.map((o: string) => <li key={o}><Ic n="check" s={14} /> {o}</li>)}</ul></div>}
        {tab === 'Curriculum' && <div className="grid">{c.lessons.map((l: any) => <div className="card row between" key={l.id}><span>{l.order}. {l.title}</span>{l.isPreview || c.entitled ? <span className="pill ok">Available</span> : <span className="pill"><Ic n="lock" s={12} /> Locked</span>}</div>)}</div>}
        {tab === 'Reviews' && <div>{c.entitled && <div className="card" style={{ marginBottom: 16 }}><h3>Rate this course</h3><select className="select" style={{ maxWidth: 120, marginTop: 8 }} value={rating} onChange={e => setRating(+e.target.value)}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} stars</option>)}</select><textarea className="textarea" style={{ marginTop: 8 }} placeholder="Share your experience" value={comment} onChange={e => setComment(e.target.value)} /><button className="btn primary sm" style={{ marginTop: 8 }} onClick={review}>Submit review</button>{msg && <p className="okmsg">{msg}</p>}</div>}
          {c.reviews.length ? c.reviews.map((r: any) => <div className="card" key={r.id} style={{ marginBottom: 10 }}><Stars n={r.rating} /> <b>{r.user.name}</b> <span className="muted small">{date(r.createdAt)}</span><p className="muted" style={{ marginTop: 6 }}>{r.comment}</p></div>) : <div className="empty">No reviews yet.</div>}</div>}
        {tab === 'Requirements' && <ul style={{ lineHeight: 2, color: '#b8c7ec' }}>{c.requirements.map((o: string) => <li key={o}><Ic n="check" s={14} /> {o}</li>)}</ul>}
        {tab === 'Certificate' && <div className="card">{c.certificateEligible ? <><Ic n="award" s={18} /> Finish every lesson to earn a verifiable certificate from DONWIZ HANDSOME DIGITAL SKILL HUB.</> : 'This course does not issue a certificate.'}</div>}
      </div>
      <aside className="grid">
        <div className="card"><h4>Instructor</h4><div className="row" style={{ marginTop: 10 }}><div className="av">D</div><div><b>{c.instructor}</b><div className="small muted">AI &amp; Digital Skills Expert</div></div></div></div>
        <div className="card"><h4>Requirements</h4><ul className="small muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>{c.requirements.map((o: string) => <li key={o}>{o}</li>)}</ul></div>
        <div className="card"><h4>Certificate</h4><p className="small muted" style={{ marginTop: 6 }}>Get a certificate of completion from DONWIZ HANDSOME DIGITAL SKILL HUB.</p></div>
      </aside>
    </div>
  </main>;
}
