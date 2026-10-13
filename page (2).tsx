'use client';
import { Ic } from '../../components/Icon';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { money, money2, date } from '../../lib/format';
import { Loading, ErrorBox } from '../../components/ui';

const TABS: [string, string][] = [['grid', 'Dashboard'], ['book', 'Courses'], ['user', 'Users'], ['card', 'Payments'], ['cpu', 'AI Tools'], ['bag', 'Marketplace'], ['users', 'Community'], ['briefcase', 'Jobs'], ['dollar', 'Withdrawals'], ['gear', 'Settings']];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
async function toR2(kind: 'video' | 'file', file: File) {
  const type = file.type || 'application/octet-stream';
  const { key, url } = await api('/admin/upload-url', { method: 'POST', json: { kind, filename: file.name, contentType: type } });
  const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': type }, body: file });
  if (!r.ok) throw new Error('Upload to storage failed. Check the R2 bucket CORS settings.');
  return key as string;
}
const act = async (fn: () => Promise<any>, done: () => void) => { try { await fn(); done(); } catch (e: any) { alert(e.message); } };

export default function Admin() {
  const { user, loading } = useAuth(), router = useRouter(); const [tab, setTab] = useState('Dashboard');
  useEffect(() => { if (!loading && (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role))) router.replace('/login?next=/admin'); }, [loading, user, router]);
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return <main className="wrap"><Loading /></main>;
  return <main className="wrap"><div className="app">
    <nav className="side">{TABS.map(([i, t]) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}><Ic n={i} s={16} /> {t}</button>)}</nav>
    <section style={{ minWidth: 0 }}><h2 style={{ marginBottom: 16 }}>Admin {tab}</h2>
      {tab === 'Dashboard' && <Overview />}{tab === 'Courses' && <Courses />}{tab === 'Users' && <Users me={user.id} />}{tab === 'Payments' && <Payments />}{tab === 'AI Tools' && <Tools />}{tab === 'Marketplace' && <Products />}{tab === 'Community' && <Posts />}{tab === 'Jobs' && <Jobs />}{tab === 'Withdrawals' && <Withdrawals />}{tab === 'Settings' && <Settings />}
    </section></div></main>;
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return <div className="card scroll-x"><table className="t"><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}{!rows.length && <tr><td colSpan={head.length} className="muted">Nothing here yet.</td></tr>}</tbody></table></div>;
}
const Pub = ({ on, set }: { on: boolean; set: () => void }) => <button className={`btn sm${on ? '' : ' primary'}`} onClick={set}>{on ? 'Unpublish' : 'Publish'}</button>;
const status = (s: string) => <span className={`pill ${['SUCCESSFUL', 'PAID', 'APPROVED'].includes(s) ? 'ok' : s === 'PENDING' ? 'warn' : 'bad'}`}>{s}</span>;
function Data<T = any>({ path, children }: { path: string; children: (d: T, reload: () => void) => ReactNode }) {
  const { data, loading, error, reload } = useApi<T>(path); if (loading && !data) return <Loading />; if (error) return <ErrorBox msg={error} />; return <>{children(data as T, reload)}</>;
}

function Overview() {
  return <Data<any> path="/admin/overview">{d => {
    const max = Math.max(1, ...d.chart.map((c: any) => c.revenue)); const pts = d.chart.map((c: any, i: number) => `${20 + i * 60},${130 - (c.revenue / max) * 110}`).join(' ');
    const top = [['users', 'Total Users', d.users], ['dollar', 'Total Revenue', money2(d.revenue)], ['cap', 'Course Sales', d.courseSales], ['clock', 'Pending Withdrawals', d.pendingWithdrawals]];
    const low = [['book', 'Total Courses', d.courses], ['cpu', 'AI Tool Usage', d.aiUsage], ['link', 'Referral Commissions', money2(d.commissions)], ['dollar', 'Total Withdrawals', money2(d.withdrawn)]];
    const Card = ([i, t, v]: any) => <div className="card stat" key={t}><div className="ic"><Ic n={i as string} s={20} /></div><div><small>{t}</small><b>{v}</b></div></div>;
    return <><div className="grid g4">{top.map(Card)}</div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', marginTop: 18 }}>
        <div className="card"><div className="row between"><h3>Revenue Overview</h3><span className="pill">Last 7 days</span></div><svg viewBox="0 0 400 150" style={{ width: '100%', marginTop: 10 }}><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f7bff" stopOpacity=".5" /><stop offset="1" stopColor="#2f7bff" stopOpacity="0" /></linearGradient></defs><polygon points={`20,130 ${pts} 380,130`} fill="url(#a)" /><polyline points={pts} fill="none" stroke="#3d8bff" strokeWidth="2.5" />{d.chart.map((c: any, i: number) => <text key={i} x={20 + i * 60} y="146" fontSize="9" textAnchor="middle" fill="#8da2cf">{c.date}</text>)}</svg></div>
        <div className="card"><h3>Recent Transactions</h3>{d.recent.map((t: any) => <div key={t.id} className="row between small" style={{ padding: '7px 0', borderBottom: '1px solid #ffffff10' }}><span>{t.user.name} · {t.type}</span><span>{money2(t.usdAmount)} {status(t.status)}</span></div>)}{!d.recent.length && <p className="muted small">No transactions yet.</p>}</div></div>
      <div className="grid g4" style={{ marginTop: 18 }}>{low.map(Card)}</div></>;
  }}</Data>;
}

function Courses() {
  const [f, setF] = useState({ title: '', price: '15', category: 'AI', level: 'BEGINNER', durationMinutes: '60', description: '' }); const [open, setOpen] = useState<any>(null);
  return <Data<any[]> path="/admin/courses">{(rows, reload) => <>
    <div className="card" style={{ marginBottom: 16 }}><h3>New course</h3><div className="grid g3"><div><label className="f">Title</label><input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div><div><label className="f">Price (USD)</label><input className="input" type="number" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></div><div><label className="f">Category</label><input className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></div><div><label className="f">Level</label><select className="select" value={f.level} onChange={e => setF({ ...f, level: e.target.value })}><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select></div><div><label className="f">Duration (minutes)</label><input className="input" type="number" value={f.durationMinutes} onChange={e => setF({ ...f, durationMinutes: e.target.value })} /></div></div><label className="f">Description</label><textarea className="textarea" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /><button className="btn primary" style={{ marginTop: 12 }} onClick={() => act(() => api('/admin/courses', { method: 'POST', json: { ...f, slug: slugify(f.title), price: Math.round(+f.price * 100), durationMinutes: +f.durationMinutes } }), () => { setF({ ...f, title: '', description: '' }); reload(); })}>Create (unpublished)</button></div>
    <Table head={['Course', 'Price', 'Lessons', 'Sales', 'Status', '']} rows={rows.map(c => [<b key="t">{c.title}</b>, money(c.price), c.lessons.length, c._count.purchases, <Pub key="p" on={c.published} set={() => act(() => api(`/admin/courses/${c.id}`, { method: 'PATCH', json: { published: !c.published } }), reload)} />, <button key="l" className="btn sm" onClick={() => setOpen(c)}>Lessons</button>])} />
    {open && <Lessons course={rows.find(r => r.id === open.id)} onClose={() => setOpen(null)} reload={reload} />}</>}</Data>;
}
function Lessons({ course, onClose, reload }: { course: any; onClose: () => void; reload: () => void }) {
  const [title, setTitle] = useState('');
  const upload = async (l: any, file: File) => { await act(async () => { const key = await toR2('video', file); await api(`/admin/lessons/${l.id}`, { method: 'PATCH', json: { videoKey: key } }); }, reload); };
  return <div className="modal-bg" onClick={onClose}><div className="card modal" style={{ maxWidth: 720, maxHeight: '88vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
    <div className="row between"><h3>{course.title} · lessons</h3><button className="btn sm" onClick={onClose}>Close</button></div>
    {course.lessons.map((l: any) => <div key={l.id} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid #ffffff10' }}><span>{l.order}. {l.title} {l.videoKey ? <span className="pill ok">video</span> : <span className="pill warn">no video</span>}</span>
      <span className="row"><button className="btn sm" onClick={() => act(() => api(`/admin/lessons/${l.id}`, { method: 'PATCH', json: { isPreview: !l.isPreview } }), reload)}>{l.isPreview ? 'Free preview' : 'Paid'}</button><label className="btn sm primary" style={{ cursor: 'pointer' }}>Upload video<input type="file" accept="video/*" hidden onChange={e => e.target.files?.[0] && upload(l, e.target.files[0])} /></label><button className="btn sm danger" onClick={() => confirm('Delete lesson?') && act(() => api(`/admin/lessons/${l.id}`, { method: 'DELETE' }), reload)}><Ic n="x" s={14} /></button></span></div>)}
    <div className="row" style={{ marginTop: 14 }}><input className="input grow" placeholder="New lesson title" value={title} onChange={e => setTitle(e.target.value)} /><button className="btn primary" disabled={title.length < 2} onClick={() => act(() => api(`/admin/courses/${course.id}/lessons`, { method: 'POST', json: { title, order: course.lessons.length + 1 } }), () => { setTitle(''); reload(); })}>Add lesson</button></div></div></div>;
}

function Users({ me }: { me: string }) {
  const [q, setQ] = useState('');
  return <><input className="input" style={{ marginBottom: 12 }} placeholder="Search name or email…" value={q} onChange={e => setQ(e.target.value)} />
    <Data<any[]> path={`/admin/users?q=${encodeURIComponent(q)}`}>{(rows, reload) => <Table head={['User', 'Role', 'Plan', 'Credits', 'Joined']} rows={rows.map(u => [<span key="n"><b>{u.name}</b><br /><span className="small muted">{u.email}</span></span>,
      <select key="r" className="select" disabled={u.id === me} value={u.role} onChange={e => act(() => api(`/admin/users/${u.id}`, { method: 'PATCH', json: { role: e.target.value } }), reload)}>{['STUDENT', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'].map(r => <option key={r}>{r}</option>)}</select>,
      <select key="m" className="select" value={u.membership} onChange={e => act(() => api(`/admin/users/${u.id}`, { method: 'PATCH', json: { membership: e.target.value } }), reload)}>{['FREE', 'PRO', 'BUSINESS'].map(r => <option key={r}>{r}</option>)}</select>,
      <span key="c">{u.creditBalance} <button className="btn sm" onClick={() => { const n = parseInt(prompt('Credits to add (negative to remove)') || '0'); if (n) act(() => api(`/admin/users/${u.id}`, { method: 'PATCH', json: { addCredits: n } }), reload); }}>Adjust</button></span>, date(u.createdAt)])} />}</Data></>;
}
const Payments = () => <Data<any[]> path="/admin/transactions">{rows => <Table head={['Date', 'User', 'Type', 'USD', 'Charged', 'Provider', 'Status']} rows={rows.map(t => [date(t.createdAt), t.user.name, t.type, money2(t.usdAmount), `${(t.amount / 100).toFixed(2)} ${t.currency}`, t.provider, status(t.status)])} />}</Data>;
const Tools = () => <Data<any[]> path="/admin/tools">{(rows, reload) => <Table head={['Tool', 'Credits', 'Premium', 'Active']} rows={rows.map(t => [t.name, <input key="c" className="input" style={{ width: 80 }} type="number" defaultValue={t.creditCost} onBlur={e => +e.target.value !== t.creditCost && act(() => api(`/admin/tools/${t.id}`, { method: 'PATCH', json: { creditCost: +e.target.value } }), reload)} />, <button key="p" className="btn sm" onClick={() => act(() => api(`/admin/tools/${t.id}`, { method: 'PATCH', json: { premium: !t.premium } }), reload)}>{t.premium ? 'Pro only' : 'Everyone'}</button>, <Pub key="a" on={t.active} set={() => act(() => api(`/admin/tools/${t.id}`, { method: 'PATCH', json: { active: !t.active } }), reload)} />])} />}</Data>;
function Products() {
  const attach = async (p: any, file: File, reload: () => void) => { await act(async () => { const key = await toR2('file', file); await api(`/admin/products/${p.id}`, { method: 'PATCH', json: { fileKey: key } }); }, reload); };
  return <Data<any[]> path="/admin/products">{(rows, reload) => <Table head={['Product', 'Type', 'Price', 'File', 'Status']} rows={rows.map(p => [p.title, p.type, money(p.price), <label key="f" className="btn sm" style={{ cursor: 'pointer' }}>{p.fileKey ? 'Replace' : 'Upload'}<input type="file" hidden onChange={e => e.target.files?.[0] && attach(p, e.target.files[0], reload)} /></label>, <Pub key="p" on={p.published} set={() => act(() => api(`/admin/products/${p.id}`, { method: 'PATCH', json: { published: !p.published } }), reload)} />])} />}</Data>;
}
const Posts = () => <Data<any[]> path="/admin/posts">{(rows, reload) => <Table head={['Author', 'Post', 'Date', '']} rows={rows.map(p => [p.user.name, <span key="b" className="small">{p.body.slice(0, 90)}</span>, date(p.createdAt), <button key="h" className="btn sm" onClick={() => act(() => api(`/admin/posts/${p.id}`, { method: 'PATCH', json: { published: !p.published } }), reload)}>{p.published ? 'Hide' : 'Restore'}</button>])} />}</Data>;
function Jobs() {
  const [f, setF] = useState({ title: '', company: '', payment: '', type: 'FREELANCE', description: '' });
  return <Data<any[]> path="/admin/jobs">{(rows, reload) => <><div className="card" style={{ marginBottom: 16 }}><h3>Post a job</h3><div className="grid g3">{(['title', 'company', 'payment'] as const).map(k => <div key={k}><label className="f">{k}</label><input className="input" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}<div><label className="f">Type</label><select className="select" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['FREELANCE', 'FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'].map(t => <option key={t}>{t}</option>)}</select></div></div><label className="f">Description</label><textarea className="textarea" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /><button className="btn primary" style={{ marginTop: 12 }} onClick={() => act(() => api('/admin/jobs', { method: 'POST', json: { ...f, payment: f.payment || undefined, published: true } }), () => { setF({ ...f, title: '', description: '' }); reload(); })}>Publish job</button></div>
    <Table head={['Job', 'Company', 'Applicants', 'Status']} rows={rows.map(j => [j.title, j.company, j._count.applications, <Pub key="p" on={j.published} set={() => act(() => api(`/admin/jobs/${j.id}`, { method: 'PATCH', json: { published: !j.published } }), reload)} />])} /></>}</Data>;
}
const Withdrawals = () => <Data<any[]> path="/admin/withdrawals">{(rows, reload) => <Table head={['Date', 'User', 'Amount', 'Payout details', 'Status', '']} rows={rows.map(w => [date(w.createdAt), <span key="u">{w.user.name}<br /><span className="small muted">{w.user.email}</span></span>, money2(w.amount), <span key="d" className="small">{w.payoutDetails}</span>, status(w.status), <span key="a" className="row">{w.status === 'PENDING' && <button className="btn sm" onClick={() => act(() => api(`/admin/withdrawals/${w.id}`, { method: 'PATCH', json: { status: 'APPROVED' } }), reload)}>Approve</button>}{['PENDING', 'APPROVED'].includes(w.status) && <><button className="btn sm primary" onClick={() => confirm('Mark as paid out?') && act(() => api(`/admin/withdrawals/${w.id}`, { method: 'PATCH', json: { status: 'PAID' } }), reload)}>Mark paid</button><button className="btn sm danger" onClick={() => act(() => api(`/admin/withdrawals/${w.id}`, { method: 'PATCH', json: { status: 'REJECTED' } }), reload)}>Reject</button></>}</span>])} />}</Data>;
const LABELS: Record<string, string> = { PRO_PRICE: 'Pro price / month (cents)', BUSINESS_PRICE: 'Business price / month (cents)', YEARLY_DISCOUNT: 'Yearly discount (%)', CREDITS_100_PRICE: '100 credits price (cents)', CREDITS_500_PRICE: '500 credits price (cents)', CREDITS_1500_PRICE: '1500 credits price (cents)', REFERRAL_RATE: 'Referral commission (%)', WITHDRAWAL_MINIMUM: 'Minimum withdrawal (cents)', SIGNUP_CREDITS: 'Signup bonus credits', PRO_MONTHLY_CREDITS: 'Pro monthly credits', BUSINESS_MONTHLY_CREDITS: 'Business monthly credits', NGN_PER_USD: 'Local currency per USD (Paystack/Flutterwave)' };
function Settings() {
  const [v, setV] = useState<Record<string, string> | null>(null), [m, setM] = useState('');
  useEffect(() => { api('/admin/settings').then(setV); }, []);
  if (!v) return <Loading />;
  return <div className="card"><div className="grid g2">{Object.keys(LABELS).map(k => <div key={k}><label className="f">{LABELS[k]}</label><input className="input" type="number" value={v[k] ?? ''} onChange={e => setV({ ...v, [k]: e.target.value })} /></div>)}</div><button className="btn primary" style={{ marginTop: 14 }} onClick={() => act(() => api('/admin/settings', { method: 'PUT', json: v }), () => setM('Saved'))}>Save settings</button>{m && <span className="okmsg" style={{ marginLeft: 12 }}>{m}</span>}</div>;
}
