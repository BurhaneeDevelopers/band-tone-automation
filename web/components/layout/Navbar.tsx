'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/transcribe', label: 'Transcribe' },
    { href: '/tones', label: 'Tones' },
  ];

  return (
    <nav
      className="sticky top-0 z-40"
      style={{ background: 'rgba(10, 10, 8, 0.95)', borderBottom: '1px solid #2a2520', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-black"
            style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            BG
          </div>
          <span
            className="font-black text-sm hidden sm:block"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', color: '#f0ebe0' }}
          >
            BURHANI GUARDS
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: pathname === link.href ? '#b5651d' : '#7a7060',
                background: pathname === link.href ? 'rgba(181, 101, 29, 0.1)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors hover:bg-white/5"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#7a7060',
              border: '1px solid #2a2520',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
