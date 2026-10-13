'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';

function Form() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState(''), [done, setDone] = useState(false), [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => { e.preventDefault(); try { await api('/auth/reset-password', { method: 'POST', json: { token, password } }); setDone(true); } catch (e: any) { setErr(e.message); } };
  return <form className="card auth" onSubmit={submit}><h1>Choose a new password</h1>{done ? <p className="okmsg">Password updated. <Link href="/login" style={{ textDecoration: 'underline' }}>Log in</Link></p> : <><label className="f">New password (8+ characters)</label><input className="input" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />{err && <p className="err">{err}</p>}<button className="btn primary block" style={{ marginTop: 16 }}>Update password</button></>}</form>;
}
export default function Reset() { return <main className="wrap"><Suspense><Form /></Suspense></main>; }
