'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth';

export default function Callback() {
  const { login } = useAuth(); const [err, setErr] = useState('');
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1)); const token = p.get('token'), next = p.get('next') || '';
    window.history.replaceState(null, '', window.location.pathname); // keep the token out of the address bar
    if (!token) return setErr('Sign-in failed. Please try again.');
    login(token).then(() => { window.location.href = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'; });
  }, [login]);
  return <main className="wrap"><div className="card auth center">{err ? <p className="err">{err}</p> : <p className="muted">Signing you in…</p>}</div></main>;
}
