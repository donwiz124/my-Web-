import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export const metadata: Metadata = { title: 'DONWIZ HANDSOME Digital Skill Hub', description: 'Learn AI. Build Skills. Create. Earn.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#050b1f' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AuthProvider><Nav />{children}<Footer /></AuthProvider></body></html>;
}
