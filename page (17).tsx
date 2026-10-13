'use client';
import Link from 'next/link';
import { useCart } from '../../lib/hooks';
import { money } from '../../lib/format';
import { CheckoutButton, Cover } from '../../components/ui';

export default function Cart() {
  const cart = useCart(); const total = cart.items.reduce((n, i) => n + i.price, 0);
  return <main className="wrap section" style={{ maxWidth: 760 }}>
    <h1 className="h-title">Your cart</h1>
    {!cart.items.length ? <div className="empty" style={{ marginTop: 20 }}>Your cart is empty. <Link href="/marketplace" style={{ textDecoration: 'underline' }}>Browse the marketplace</Link></div> : <>
      <div className="grid" style={{ marginTop: 18 }}>{cart.items.map(i => <div className="card row between" key={i.id}><div className="row"><div style={{ width: 70 }}><Cover kind={i.type} /></div><b>{i.title}</b></div><div className="row"><b>{money(i.price)}</b><button className="btn sm danger" onClick={() => cart.remove(i.id)}>Remove</button></div></div>)}</div>
      <div className="card row between" style={{ marginTop: 16 }}><h3>Total {money(total)}</h3><CheckoutButton order={{ type: 'MARKETPLACE', productIds: cart.items.map(i => i.id) }} label="Checkout" /></div>
      <p className="small muted" style={{ marginTop: 8 }}>The final price is confirmed by the server at checkout.</p></>}
  </main>;
}
