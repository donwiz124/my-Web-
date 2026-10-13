'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { GoogleButton } from '../../components/ui';

function Form() {
  const sp = useSearchParams(), { login } = useAuth();
  const [f, setF] = useState({ name: '', email: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/auth/register', { method: 'POST', json: { ...f, ref: sp.get('ref') || undefined } }); await login(r.token); window.location.href = '/dashboard'; }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return <form className="card auth" onSubmit={submit}><h1>Create your account</h1><p className="muted">Learn AI. Build Skills. Create. Earn.</p>
    <label className="f">Full name</label><input className="input" required minLength={2} value={f.name} onChange={set('name')} />
    <label className="f">Email</label><input className="input" type="email" required value={f.email} onChange={set('email')} />
    <label className="f">Password (8+ characters)</label><input className="input" type="password" required minLength={8} value={f.password} onChange={set('password')} />
    {sp.get('ref') && <p className="small okmsg">Referral code applied: {sp.get('ref')}</p>}
    {err && <p className="err">{err}</p>}<button className="btn primary block" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Creating…' : 'Sign Up'}</button>
    <p className="small muted center" style={{ margin: '14px 0' }}>or</p><GoogleButton refCode={sp.get('ref')} label="Sign up with Google" />
    <p className="small muted center" style={{ marginTop: 14 }}>Already have an account? <Link href="/login">Login</Link></p></form>;
}
export default function Register() { return <main className="wrap"><Suspense><Form /></Suspense></main>; }
