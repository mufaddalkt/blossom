import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blossom Kindergarten Sr. Sec. School — Banswara',
  description: 'Blossom Kindergarten Sr. Sec. School in Banswara, Rajasthan. Each Child Matters. Play Group to Class 12.',
};

const nav = [
  ['Home','/'],['About','/about'],['Academics','/academics'],['Campus Life','/campus-life'],['Admissions','/admissions'],['Gallery','/gallery'],['Contact','/contact']
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="shell header-inner">
            <Link className="brand" href="/">
              <span className="brand-mark">B</span>
              <span><strong>Blossom School</strong><small>Banswara, Rajasthan</small></span>
            </Link>
            <nav className="desktop-nav" aria-label="Primary navigation">
              {nav.map(([label,href]) => <Link key={href} href={href}>{label}</Link>)}
            </nav>
            <Link className="button small" href="/admissions">Apply for Admission</Link>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="footer">
          <div className="shell footer-grid">
            <div><div className="brand footer-brand"><span className="brand-mark">B</span><span><strong>Blossom Kindergarten Sr. Sec. School</strong><small>Each Child Matters.</small></span></div></div>
            <div><h3>Explore</h3>{nav.map(([label,href]) => <Link key={href} href={href}>{label}</Link>)}</div>
            <div><h3>Contact</h3><p>Kagdi Pickup Internal Road, Rishi Kunj, Banswara, Rajasthan 327001</p><a href="tel:+919462252553">+91 9462 252 553</a><a href="mailto:blossomschoolbanswara@gmail.com">blossomschoolbanswara@gmail.com</a></div>
          </div>
          <div className="shell copyright">© {new Date().getFullYear()} Blossom Kindergarten Sr. Sec. School.</div>
        </footer>
      </body>
    </html>
  );
}
