'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function Forgot() {
  const [email, setEmail] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => { e.preventDefault(); try { await api('/auth/forgot-password', { method: 'POST', json: { email } }); setSent(true); } catch (e: any) { setErr(e.message); } };
  return <main className="wrap"><form className="card auth" onSubmit={submit}><h1>Reset password</h1>{sent ? <p className="okmsg">If an account exists for that email, a reset link is on its way.</p> : <><label className="f">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />{err && <p className="err">{err}</p>}<button className="btn primary block" style={{ marginTop: 16 }}>Send reset link</button></>}</form></main>;
}
