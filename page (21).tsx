'use client';
import { Ic } from '../../../components/Icon';
import { useParams } from 'next/navigation';
import { useApi } from '../../../lib/hooks';
import { date } from '../../../lib/format';
import { Loading } from '../../../components/ui';

export default function VerifyCertificate() {
  const { token } = useParams<{ token: string }>();
  const { data, loading, error } = useApi<any>(`/platform/certificates/verify/${token}`);
  if (loading) return <main className="wrap"><Loading /></main>;
  return <main className="wrap section" style={{ maxWidth: 680 }}>
    {error || !data?.valid ? <div className="card center"><h1>Certificate not found</h1><p className="muted">We could not verify this certificate.</p></div> :
      <div className="card center" style={{ padding: 40, border: '2px solid var(--blue)' }}><p className="pill ok"><Ic n="check" s={13} /> Verified certificate</p><h2 className="muted" style={{ marginTop: 16, fontWeight: 500 }}>Certificate of Completion</h2><h1 style={{ margin: '14px 0' }}>{data.student}</h1><p>has successfully completed</p><h2 style={{ margin: '10px 0' }}>{data.course}</h2><p className="muted small">Completed {date(data.completionDate)} · ID {data.certificateId}</p><p className="sig" style={{ marginTop: 22 }}>Donwiz Handsome</p><p className="small muted">Issued by {data.issuedBy} · DONWIZ HANDSOME DIGITAL SKILL HUB</p><button className="btn" style={{ marginTop: 18 }} onClick={() => window.print()}>Print / Save PDF</button></div>}
  </main>;
}
