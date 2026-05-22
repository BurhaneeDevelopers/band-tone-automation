import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: transcriptions } = await supabase
      .from('transcriptions')
      .select('id, title, original_key, duration, source_type, verified, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: toneGroups } = await supabase
      .from('tone_groups')
      .select('id, name, song_title, song_artist, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6);

    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
          {/* Welcome */}
          <div>
            <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif" }}>
              WELCOME BACK
            </p>
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
              BURHANI GUARDS BAND
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7a7060' }}>
              Sargam notation · Trumpet · Alto Saxophone · Trombone · Euphonium · Drums
            </p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/transcribe"
              className="flex items-center gap-4 p-5 rounded-lg group transition-all hover:border-[#b5651d]/60"
              style={{ background: '#111109', border: '1px solid #2a2520' }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(181, 101, 29, 0.15)', border: '1px solid rgba(181, 101, 29, 0.3)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b5651d" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-base" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
                  New Transcription
                </p>
                <p className="text-sm" style={{ color: '#7a7060' }}>YouTube URL or audio file upload</p>
              </div>
              <span className="ml-auto text-lg" style={{ color: '#b5651d' }}>→</span>
            </Link>

            <Link
              href="/tones"
              className="flex items-center gap-4 p-5 rounded-lg group transition-all hover:border-[#b5651d]/60"
              style={{ background: '#111109', border: '1px solid #2a2520' }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(107, 140, 186, 0.1)', border: '1px solid rgba(107, 140, 186, 0.3)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b8cba" strokeWidth="2">
                  <path d="M19 11H5M19 6H5M19 16H5M19 21H5" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-base" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
                  Tone Groups
                </p>
                <p className="text-sm" style={{ color: '#7a7060' }}>Manage and merge arranged pieces</p>
              </div>
              <span className="ml-auto text-lg" style={{ color: '#6b8cba' }}>→</span>
            </Link>
          </div>

          {/* Recent transcriptions */}
          <div>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
              Recent Transcriptions
            </h2>
            {transcriptions && transcriptions.length > 0 ? (
              <div className="space-y-2">
                {transcriptions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: '#111109', border: '1px solid #2a2520' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Source type icon */}
                      <span
                        className="shrink-0 text-xs px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: t.source_type === 'youtube' ? 'rgba(220,38,38,0.15)' : 'rgba(181,101,29,0.15)',
                          color: t.source_type === 'youtube' ? '#ef4444' : '#b5651d',
                          border: `1px solid ${t.source_type === 'youtube' ? 'rgba(220,38,38,0.3)' : 'rgba(181,101,29,0.3)'}`,
                        }}
                      >
                        {t.source_type === 'youtube' ? 'YT' : 'UP'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#f0ebe0', fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {t.title}
                        </p>
                        <p className="text-xs" style={{ color: '#7a7060' }}>
                          Key: {t.original_key} → C · {Number(t.duration ?? 0).toFixed(1)}s · {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.verified ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                        >
                          ✓ Verified
                        </span>
                      ) : (
                        <Link
                          href={`/verify/${t.id}`}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold transition-colors hover:opacity-80"
                          style={{ background: 'rgba(181,101,29,0.15)', color: '#b5651d', border: '1px solid rgba(181,101,29,0.3)' }}
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-lg p-8 text-center"
                style={{ background: '#0e0e0b', border: '1px dashed #2a2520' }}
              >
                <p className="text-sm mb-3" style={{ color: '#7a7060' }}>No transcriptions yet</p>
                <Link href="/transcribe" className="text-sm font-semibold" style={{ color: '#b5651d' }}>
                  Upload your first audio segment →
                </Link>
              </div>
            )}
          </div>

          {/* Tone groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
                Tone Groups
              </h2>
              <Link href="/tones" className="text-xs font-semibold" style={{ color: '#b5651d' }}>View all →</Link>
            </div>
            {toneGroups && toneGroups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {toneGroups.map(g => (
                  <Link
                    key={g.id}
                    href={`/tones/${g.id}`}
                    className="p-4 rounded-lg hover:border-[#b5651d]/40 transition-colors"
                    style={{ background: '#111109', border: '1px solid #2a2520' }}
                  >
                    <p className="font-bold text-sm" style={{ color: '#f0ebe0', fontFamily: "'Barlow Condensed', sans-serif" }}>{g.name}</p>
                    {(g.song_title || g.song_artist) && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#b5651d' }}>
                        {[g.song_artist, g.song_title].filter(Boolean).join(' — ')}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: '#7a7060' }}>{new Date(g.created_at).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="rounded-lg p-6 text-center"
                style={{ background: '#0e0e0b', border: '1px dashed #2a2520' }}
              >
                <p className="text-sm" style={{ color: '#7a7060' }}>No tone groups yet. Create one when saving a transcription.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Unauthenticated: Landing page
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
        {/* Logo mark */}
        <div className="relative mb-8">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(181, 101, 29, 0.1)', border: '1px solid rgba(181, 101, 29, 0.4)' }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#b5651d" strokeWidth="1.5">
              <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9 10l12-3" />
            </svg>
          </div>
        </div>

        <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif" }}>
          BURHANI GUARDS BAND
        </p>
        <h1
          className="text-5xl sm:text-6xl font-black mb-4 leading-none"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}
        >
          MUSIC<br />TRANSCRIPTION
        </h1>
        <p className="text-base max-w-md mb-2" style={{ color: '#c8bfa8' }}>
          Convert any song — including YouTube hip hop — into complete band sargam notation with drum patterns.
        </p>
        <p className="text-sm mb-10" style={{ color: '#7a7060' }}>
          Trumpet · Alto Saxophone · Trombone · Euphonium · Drums · Bass Drum
        </p>

        <div className="flex gap-3">
          <Link
            href="/auth/signup"
            className="px-6 py-3 rounded-lg font-bold text-sm transition-all hover:opacity-90"
            style={{
              background: '#b5651d',
              color: '#0a0a08',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 rounded-lg font-bold text-sm transition-all hover:bg-white/5"
            style={{
              border: '1px solid #2a2520',
              color: '#c8bfa8',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full">
          {[
            { title: 'YouTube Support', desc: 'Paste any YouTube link and get sargam notation for the band' },
            { title: 'Stem Separation', desc: 'AI splits vocals, melody, bass, and drums before transcribing' },
            { title: 'Fixed Sa = C', desc: 'Every song transposed to C — consistent notation across all pieces' },
            { title: 'Drum Patterns', desc: '16th-note kick/snare/hi-hat grid auto-detected from the track' },
          ].map(f => (
            <div
              key={f.title}
              className="p-4 rounded-lg text-left"
              style={{ background: '#111109', border: '1px solid #2a2520' }}
            >
              <p className="font-bold text-sm mb-1" style={{ color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif" }}>{f.title}</p>
              <p className="text-xs" style={{ color: '#7a7060' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
