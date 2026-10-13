'use client';
import { Ic } from './Icon';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './ui';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/hooks';

const LINKS: [string, string][] = [['Home', '/'], ['Courses', '/courses'], ['AI Tools', '/ai-tools'], ['Marketplace', '/marketplace'], ['Community', '/community'], ['Jobs & Opportunities', '/jobs'], ['Pricing', '/pricing'], ['About', '/about']];
export default function Nav() {
  const path = usePathname(), router = useRouter(), { user } = useAuth(), cart = useCart();
  const [open, setOpen] = useState(false);
  return <header className="nav"><div className="wrap">
    <Logo />
    <nav className={`nav-links${open ? ' open' : ''}`} onClick={() => setOpen(false)}>
      {LINKS.map(([t, h]) => <Link key={h} href={h} className={(h === '/' ? path === '/' : path.startsWith(h)) ? 'on' : ''}>{t}</Link>)}
    </nav>
    <div className="row auth-btns" style={{ gap: 10, marginLeft: 'auto' }}>
      <Link href="/search" title="Search"><Ic n="search" s={18} /></Link>
      {cart.items.length > 0 && <Link href="/cart" title="Cart"><Ic n="cart" s={18} /><sup>{cart.items.length}</sup></Link>}
      {user ? <><Link href={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'} className="btn sm">{user.role === 'STUDENT' || user.role === 'CREATOR' ? 'Dashboard' : 'Admin'}</Link></>
        : <><Link href="/login" className="btn sm">Login</Link><Link href="/register" className="btn sm primary">Sign Up</Link></>}
    </div>
    <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}><Ic n="menu" s={24} /></button>
  </div></header>;
}
