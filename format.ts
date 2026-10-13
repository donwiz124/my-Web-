export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
export const money2 = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const level = (l: string) => l.charAt(0) + l.slice(1).toLowerCase();
export const hours = (m: number) => (m >= 60 ? `${Math.round(m / 6) / 10}h` : `${m}m`);
export const ago = (d: string) => { const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} hours ago`; return `${Math.floor(s / 86400)} days ago`; };
export const date = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
