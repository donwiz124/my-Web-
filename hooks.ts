'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const load = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api<T>(path).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [path]);
  useEffect(load, [load]);
  return { data, error, loading, reload: load, setData };
}

export type CartItem = { id: string; title: string; price: number; type: string };
const CK = 'dh_cart';
const read = (): CartItem[] => { try { return JSON.parse(localStorage.getItem(CK) || '[]'); } catch { return []; } };
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { const s = () => setItems(read()); s(); window.addEventListener('dh-cart', s); return () => window.removeEventListener('dh-cart', s); }, []);
  const save = (n: CartItem[]) => { localStorage.setItem(CK, JSON.stringify(n)); window.dispatchEvent(new Event('dh-cart')); };
  return { items, add: (i: CartItem) => !read().some(x => x.id === i.id) && save([...read(), i]), remove: (id: string) => save(read().filter(x => x.id !== id)), clear: () => save([]) };
}
