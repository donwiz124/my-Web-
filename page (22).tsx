'use client';
import { Ic } from '../../../components/Icon';
import Link from 'next/link';
import { useApi } from '../../../lib/hooks';
import { date } from '../../../lib/format';
import { Loading } from '../../../components/ui';

export default function Certs() {
  const { data, loading } = useApi<any[]>('/platform/certificates');
  return <div><h2>Certificates</h2>{loading ? <Loading /> : !data!.length ? <div className="empty" style={{ marginTop: 12 }}>Complete a course to earn your first certificate.</div> : <div className="grid g2" style={{ marginTop: 12 }}>{data!.map(c => <div className="card" key={c.id}><h3><Ic n="award" s={20} /> {c.course.title}</h3><p className="small muted" style={{ margin: '6px 0 12px' }}>{c.certificateId} · {date(c.completionDate)}</p><Link className="btn sm primary" href={`/verify/${c.verificationToken}`}>View &amp; share</Link></div>)}</div>}</div>;
}
