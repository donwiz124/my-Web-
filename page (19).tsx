'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { GoogleButton } from '../../components/ui';

function Form() {
  const sp = useSearchParams(), { login } = useAuth();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/auth/login', { method: 'POST', json: { email, password } }); await login(r.token); const n = sp.get('next'); window.location.href = n && n.startsWith('/') ? n : (r.user.role === 'STUDENT' || r.user.role === 'CREATOR' ? '/dashboard' : '/admin'); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return <form className="card auth" onSubmit={submit}><h1>Welcome back</h1><p className="muted">Log in to continue learning.</p>
    <label className="f">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
    <label className="f">Password</label><input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
    {(err || sp.get('error')) && <p className="err">{err || sp.get('error')}</p>}<button className="btn primary block" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
    <p className="small muted center" style={{ margin: '14px 0' }}>or</p><GoogleButton next={sp.get('next')} />
    <p className="small muted center" style={{ marginTop: 14 }}><Link href="/forgot-password">Forgot password?</Link> · <Link href="/register">Create account</Link></p></form>;
}
export default function Login() { return <main className="wrap"><Suspense><Form /></Suspense></main>; }
