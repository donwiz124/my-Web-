'use client';
import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

export default function Settings() {
  const { user, refresh, logout } = useAuth(); const [name, setName] = useState(user?.name || ''), [cur, setCur] = useState(''), [nxt, setNxt] = useState(''), [m1, setM1] = useState(''), [m2, setM2] = useState('');
  return <div><h2>Settings</h2><div className="grid g2" style={{ marginTop: 12 }}>
    <div className="card"><h3>Profile</h3><label className="f">Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} /><label className="f">Email</label><input className="input" value={user?.email} readOnly /><button className="btn primary" style={{ marginTop: 12 }} onClick={async () => { try { await api('/account/me', { method: 'PATCH', json: { name } }); await refresh(); setM1('Saved'); } catch (e: any) { setM1(e.message); } }}>Save</button>{m1 && <p className="small muted">{m1}</p>}</div>
    <div className="card"><h3>Change password</h3><label className="f">Current password</label><input className="input" type="password" value={cur} onChange={e => setCur(e.target.value)} /><label className="f">New password</label><input className="input" type="password" value={nxt} onChange={e => setNxt(e.target.value)} /><button className="btn primary" style={{ marginTop: 12 }} onClick={async () => { try { await api('/account/change-password', { method: 'POST', json: { current: cur, next: nxt } }); setM2('Password updated'); setCur(''); setNxt(''); } catch (e: any) { setM2(e.message); } }}>Update</button>{m2 && <p className="small muted">{m2}</p>}</div></div>
    <button className="btn danger" style={{ marginTop: 20 }} onClick={logout}>Log out</button></div>;
}
