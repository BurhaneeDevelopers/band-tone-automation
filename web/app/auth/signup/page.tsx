'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); return; }
      router.push('/transcribe');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px 12px',
    background: '#1e1c15', border: '1px solid #2a2520', borderRadius: '8px',
    color: '#f0ebe0', fontSize: '14px', fontFamily: "'Barlow', sans-serif", outline: 'none',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-widest mb-2" style={{ color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif" }}>
            BURHANI GUARDS BAND
          </p>
          <h1 className="text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
            CREATE ACCOUNT
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle} />
          </div>

          {error && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: 'rgba(192, 57, 43, 0.1)', border: '1px solid rgba(192, 57, 43, 0.3)', color: '#e74c3c' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#7a7060' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: '#b5651d' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
