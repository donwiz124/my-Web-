import Link from 'next/link';
import { Logo } from './ui';
export default function Footer() {
  return <footer className="footer"><div className="wrap"><div className="cols">
    <div style={{ flexDirection: 'column', gap: 6 }}><Logo /><span className="muted small">Learn AI. Build Skills. Create. Earn.</span></div>
    <div>{[['About', '/about'], ['Courses', '/courses'], ['AI Tools', '/ai-tools'], ['Marketplace', '/marketplace'], ['Community', '/community'], ['Jobs', '/jobs'], ['Pricing', '/pricing'], ['Contact', '/about#contact']].map(([t, h]) => <Link key={t} href={h}>{t}</Link>)}</div>
    <span className="muted small">© {new Date().getFullYear()} DONWIZ HANDSOME DIGITAL SKILL HUB. All rights reserved.</span>
  </div></div></footer>;
}
