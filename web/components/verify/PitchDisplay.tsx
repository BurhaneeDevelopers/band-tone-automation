'use client';

import { useEffect, useState } from 'react';
import { RealtimePitchDetector } from '@/lib/pitch-detect';

interface PitchDisplayProps {
  audioElement: HTMLAudioElement | null;
}

export function PitchDisplay({ audioElement }: PitchDisplayProps) {
  const [sargam, setSargam] = useState<string | null>(null);
  const [freq, setFreq] = useState<number>(0);

  useEffect(() => {
    if (!audioElement) return;
    const detector = new RealtimePitchDetector((s, f) => {
      setSargam(s);
      setFreq(f);
    });
    detector.connect(audioElement);
    return () => detector.disconnect();
  }, [audioElement]);

  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3"
      style={{ background: '#0e0e0b', border: '1px solid #2a2520', minWidth: '160px' }}
    >
      <div>
        <div className="text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Hearing
        </div>
        <div
          className="text-2xl font-black"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: sargam ? '#b5651d' : '#3a3028', letterSpacing: '0.03em' }}
        >
          {sargam ?? '—'}
        </div>
        {freq > 0 && (
          <div className="text-xs mt-0.5" style={{ color: '#7a7060', fontFamily: "'JetBrains Mono', monospace" }}>
            {freq.toFixed(0)} Hz
          </div>
        )}
      </div>
    </div>
  );
}
