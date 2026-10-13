'use client';
import { useState } from 'react';
import { useApi } from '../../lib/hooks';
import { ProductCard, typeLabel, Loading, ErrorBox } from '../../components/ui';

const TYPES = ['PROMPT', 'TEMPLATE', 'EBOOK', 'DESIGN', 'VIDEO'];
export default function Marketplace() {
  const [t, setT] = useState('');
  const { data, loading, error } = useApi<any[]>(`/marketplace/products${t ? `?type=${t}` : ''}`);
  return <main className="wrap section">
    <h1 className="h-title">Marketplace</h1><p className="h-sub">Digital products to boost your skills and creativity.</p>
    <div className="chips"><button className={`chip${!t ? ' on' : ''}`} onClick={() => setT('')}>All</button>{TYPES.map(x => <button key={x} className={`chip${t === x ? ' on' : ''}`} onClick={() => setT(x)}>{typeLabel(x)}</button>)}</div>
    {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : !data!.length ? <div className="empty">No products in this category yet.</div> : <div className="grid g3">{data!.map(p => <ProductCard key={p.id} p={p} />)}</div>}
  </main>;
}
