'use client';
import { Ic } from '../../../components/Icon';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

function Verify() {
  const sp = useSearchParams(), { refresh } = useAuth();
  const [state, setState] = useState<'checking' | 'ok' | 'fail'>('checking'), [type, setType] = useState(''), [msg, setMsg] = useState('');
  const tries = useRef(0);
  useEffect(() => {
    const reference = sp.get('reference') || sp.get('tx_ref') || '', sessionId = sp.get('session_id') || undefined;
    if (sp.get('status') === 'cancelled') { setState('fail'); setMsg('Payment was cancelled.'); return; }
    const attempt = async () => {
      try { const r = await api('/payments/verify', { method: 'POST', json: { reference, sessionId } }); setType(r.type); if (r.type === 'MARKETPLACE') localStorage.removeItem('dh_cart'); await refresh(); setState('ok'); }
      catch (e: any) { if (++tries.current < 6) setTimeout(attempt, 2500); else { setState('fail'); setMsg(e.message); } }
    };
    attempt();
  }, [sp, refresh]);
  const next = type === 'COURSE' ? ['/dashboard/courses', 'Go to my courses'] : type === 'CREDITS' ? ['/ai-tools', 'Use my credits'] : type === 'MARKETPLACE' ? ['/dashboard/courses', 'Open my library'] : ['/dashboard', 'Go to dashboard'];
  return <div className="card auth center">{state === 'checking' && <><h1>Confirming payment…</h1><p className="muted">Please don&apos;t close this page.</p></>}
    {state === 'ok' && <><h1><Ic n="checkcircle" s={30} /> Payment successful</h1><p className="muted" style={{ margin: '8px 0 18px' }}>Your purchase is ready.</p><Link className="btn primary" href={next[0]}>{next[1]}</Link></>}
    {state === 'fail' && <><h1>We couldn&apos;t confirm your payment</h1><p className="err">{msg}</p><p className="small muted" style={{ marginTop: 10 }}>If you were charged, it will be applied automatically within a few minutes. Contact support if not.</p><Link className="btn" style={{ marginTop: 14 }} href="/dashboard/transactions">View transactions</Link></>}</div>;
}
export default function Page() { return <main className="wrap"><Suspense><Verify /></Suspense></main>; }
