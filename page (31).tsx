import { Ic } from '../../components/Icon';
import Link from 'next/link';
import Light from '../../components/Light';

export default function About() {
  return <Light>
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', alignItems: 'center' }}>
      <div><h1 className="h-title" style={{ fontSize: '2.4rem', color: '#1d5fe0' }}>About DONWIZ HANDSOME<br />DIGITAL SKILL HUB</h1><p className="h-sub">Building a skilled generation for a better future.</p>
        <p style={{ margin: '18px 0' }}>DONWIZ HANDSOME DIGITAL SKILL HUB was founded by Wisdom C Chibuike (Donwiz Handsome) with a mission to help people develop practical AI and digital skills that can be applied to education, business, content creation, freelancing and growing communities.</p>
        <div className="grid g2">{[['cpu', 'AI & Digital Skills'], ['globe', 'Global Community'], ['wrench', 'Practical Learning'], ['briefcase', 'Real Opportunities']].map(([i, t]) => <div key={t} className="card row"><Ic n={i} s={26} /><b>{t}</b></div>)}</div></div>
      <div className="card center"><div className="ph" style={{ maxWidth: 260, margin: '0 auto' }}>Founder photo placeholder</div><h3 style={{ marginTop: 12 }}>Wisdom C Chibuike<br />(Donwiz Handsome)</h3><p className="muted small">Founder &amp; CEO</p></div>
    </div>
    <div id="contact" className="card center" style={{ marginTop: 34 }}><h3>Ready to start?</h3><div className="row" style={{ justifyContent: 'center', marginTop: 12 }}><Link href="/courses" className="btn primary">Explore Courses</Link><Link href="/register" className="btn">Create free account</Link></div></div>
  </Light>;
}
