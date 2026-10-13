'use client';
import { Ic } from '../../components/Icon';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { useApi } from '../../lib/hooks';
import Light from '../../components/Light';
import { Loading, ErrorBox } from '../../components/ui';

const TYPES = [['', 'All'], ['FREELANCE', 'Freelance'], ['FULL_TIME', 'Full-time'], ['PART_TIME', 'Part-time'], ['CONTRACT', 'Contract'], ['INTERNSHIP', 'Internship']];
export default function Jobs() {
  const router = useRouter(); const [t, setT] = useState(''), [job, setJob] = useState<any>(null), [msg, setMsg] = useState(''), [res, setRes] = useState('');
  const { data, loading, error } = useApi<any[]>(`/platform/jobs${t ? `?type=${t}` : ''}`);
  const apply = async () => { try { await api(`/platform/jobs/${job.id}/apply`, { method: 'POST', json: { message: msg } }); setRes('Application sent!'); setMsg(''); } catch (e: any) { setRes(e.message); } };
  return <Light>
    <h1 className="h-title">Jobs &amp; Opportunities</h1><p className="h-sub">Find your next opportunity and take your career to the next level.</p>
    <div className="chips">{TYPES.map(([v, l]) => <button key={v} className={`chip${t === v ? ' on' : ''}`} onClick={() => setT(v)}>{l}</button>)}</div>
    {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : !data!.length ? <div className="empty">No openings right now. Check back soon!</div> : <div className="grid">{data!.map(j => <div className="card row between" key={j.id}>
      <div><h3>{j.title}</h3><p className="small muted" style={{ margin: '4px 0' }}>{j.company} · {j.remote ? 'Remote' : j.location} · {j.type.replace('_', '-').toLowerCase()}</p><p className="small">{j.description}</p>{j.payment && <b className="small"><Ic n="dollar" s={14} /> {j.payment}</b>}</div>
      <button className="btn primary" onClick={() => { if (!getToken()) return router.push('/login?next=/jobs'); setJob(j); setRes(''); }}>Apply</button></div>)}</div>}
    {job && <div className="modal-bg" onClick={() => setJob(null)}><div className="card modal" onClick={e => e.stopPropagation()}><h3>Apply: {job.title}</h3><textarea className="textarea" style={{ margin: '12px 0' }} placeholder="Introduce yourself and link to your work…" value={msg} onChange={e => setMsg(e.target.value)} /><div className="row"><button className="btn primary" onClick={apply} disabled={msg.trim().length < 10}>Send application</button><button className="btn" onClick={() => setJob(null)}>Close</button></div>{res && <p className={res.includes('sent') ? 'okmsg' : 'err'}>{res}</p>}</div></div>}
  </Light>;
}
