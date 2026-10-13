import { Ic } from '../components/Icon';
import Link from 'next/link';

function HeroArt() {
  return <svg viewBox="0 0 560 380" style={{ width: '100%', maxWidth: 560 }} aria-hidden>
    <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0e2a7a" /><stop offset="1" stopColor="#061233" /></linearGradient><radialGradient id="g"><stop offset="0" stopColor="#3d8bff" stopOpacity=".7" /><stop offset="1" stopColor="#3d8bff" stopOpacity="0" /></radialGradient></defs>
    <ellipse cx="290" cy="300" rx="250" ry="40" fill="url(#g)" />
    <path d="M110 300 L150 90 Q152 78 165 78 H415 Q428 78 430 90 L470 300 Z" fill="url(#s)" stroke="#3d7bff" strokeWidth="2" />
    <path d="M70 300 H510 L530 326 H50 Z" fill="#0b1c4d" stroke="#3d7bff" />
    <g transform="translate(290 190)"><path d="M0 -62 L54 -31 L54 31 L0 62 L-54 31 L-54 -31 Z" fill="#0a2160" stroke="#27d3f5" strokeWidth="2.5" /><text y="14" textAnchor="middle" fill="#fff" fontSize="46" fontWeight="900">AI</text></g>
    {[[130, 60, 'image'], [450, 70, 'video'], [90, 190, 'music'], [490, 200, 'bolt'], [190, 20, 'bulb'], [400, 16, 'trend']].map(([x, y, e], i) => <g key={i} transform={`translate(${x} ${y})`}><rect x="-22" y="-22" width="44" height="44" rx="11" fill="#0b1c4d" stroke="#3d7bff" /><g style={{ color: '#8fb4ff' }}><Ic n={e as string} s={24} x={-12} y={-12} /></g></g>)}
  </svg>;
}

export default function Home() {
  return <main>
    <div className="wrap">
      <section className="hero">
        <div>
          <h1>DONWIZ HANDSOME<br />DIGITAL SKILL HUB</h1>
          <h2>Learn AI. Build Digital Skills.<br /><em>Create More. Earn More.</em></h2>
          <p>Learn practical AI and digital skills through structured courses, hands-on projects, powerful AI tools, and a growing community of creators and entrepreneurs.</p>
          <div className="row" style={{ marginTop: 22 }}><Link href="/courses" className="btn primary">Explore Courses</Link><Link href="/register" className="btn">Start Learning</Link><Link href="/ai-tools" className="btn">Explore AI Tools</Link></div>
        </div>
        <div className="center"><HeroArt /></div>
      </section>
      <div className="strip">{[['cpu', 'AI & Technology', 'Learn the future'], ['cap', 'Digital Skills', 'Build your career'], ['image', 'Content Creation', 'Create & grow'], ['briefcase', 'Freelancing', 'Work from anywhere'], ['users', 'Community', 'Learn together']].map(([i, t, s]) => <div key={t}><i><Ic n={i} s={22} /></i><span><b>{t}</b><small>{s}</small></span></div>)}<div><i><Ic n="dollar" s={22} /></i><span><b>Earn</b><small>Refer & get paid</small></span></div></div>
      <section className="founder">
        <div className="ph">Founder photo placeholder<br />(upload in admin)</div>
        <div><span className="muted small">Founded by</span><h2 style={{ margin: '4px 0 10px' }}>Wisdom C Chibuike<br />(Donwiz Handsome)</h2><p className="muted" style={{ fontSize: '.9rem' }}>I&apos;m Wisdom C Chibuike, also known as Donwiz Handsome. I created this platform to help people like you learn practical AI and digital skills that can transform your life, career and future.</p><p className="sig" style={{ marginTop: 10 }}>Donwiz Handsome</p></div>
        <blockquote className="quote" style={{ margin: 0 }}>“Your skills today are your freedom tomorrow.”<div className="muted small" style={{ fontStyle: 'normal', marginTop: 12 }}>— Donwiz Handsome</div></blockquote>
      </section>
    </div>
  </main>;
}
