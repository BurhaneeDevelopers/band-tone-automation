'use client';

import Link from 'next/link';

interface FillerBannerProps {
  fillerCount: number;
  transcriptionId?: string;
}

export function FillerBanner({ fillerCount, transcriptionId }: FillerBannerProps) {
  if (fillerCount === 0) return null;
  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between gap-4"
      style={{ background: 'rgba(212, 148, 61, 0.08)', border: '1px solid rgba(212, 148, 61, 0.3)' }}
    >
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4943d" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-sm" style={{ color: '#d4943d' }}>
          <strong>{fillerCount}</strong> filler note{fillerCount !== 1 ? 's' : ''} detected — barely audible or low-confidence notes.
          Review them in the Verification Player before saving.
        </p>
      </div>
      {transcriptionId && (
        <Link
          href={`/verify/${transcriptionId}`}
          className="text-xs font-bold shrink-0 px-3 py-1.5 rounded"
          style={{
            background: 'rgba(212, 148, 61, 0.15)',
            border: '1px solid rgba(212, 148, 61, 0.4)',
            color: '#d4943d',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Open Verification Player →
        </Link>
      )}
    </div>
  );
}
