'use client';

import { DrumInstrumentResult, DrumHit } from '@/types/transcription';

interface DrumPanelProps {
  drums: DrumInstrumentResult;
  bassDrum: DrumInstrumentResult;
}

const BEATS = [0, 1, 2, 3];
const SUBDIVISIONS = [0, 1, 2, 3]; // 16th notes per beat

function DrumRow({ label, hits, color }: { label: string; hits: DrumHit[]; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="text-xs font-semibold w-16 shrink-0 text-right"
        style={{ color, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em' }}
      >
        {label}
      </div>
      <div className="flex gap-1 flex-wrap">
        {BEATS.map(beat => (
          <div key={beat} className="flex gap-0.5">
            {SUBDIVISIONS.map(sub => {
              const hit = hits.find(h => h.beat === beat && h.subdivision === sub);
              const opacity = hit ? Math.max(0.3, (hit.velocity ?? 80) / 127) : 0;
              return (
                <div
                  key={sub}
                  title={hit ? `Beat ${beat + 1}.${sub + 1} vel:${hit.velocity}` : ''}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px',
                    background: hit ? color : '#1e1c15',
                    border: `1px solid ${hit ? color : '#2a2520'}`,
                    opacity: hit ? opacity : 1,
                    cursor: 'default',
                  }}
                />
              );
            })}
            {beat < 3 && (
              <div style={{ width: '1px', background: '#2a2520', margin: '0 2px' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DrumPanel({ drums, bassDrum }: DrumPanelProps) {
  const snareHits = drums.pattern.filter(h => h.type === 'snare');
  const hihatHits = drums.pattern.filter(h => h.type === 'hihat' || h.type === 'hihat_open');
  const kickHits = bassDrum.pattern;

  return (
    <div
      className="rounded-lg p-4 col-span-full"
      style={{ background: '#111109', border: '1px solid #2a2520' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className="text-xs font-bold tracking-widest mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#b5651d', letterSpacing: '0.1em' }}
          >
            DRUMS
          </div>
          <h3 className="text-base font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
            Drum Pattern
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: '#b5651d' }}
          >
            {drums.bpm.toFixed(0)} BPM
          </span>
          <div
            className="text-xs px-2 py-0.5 rounded"
            style={{ background: '#1a1a14', color: '#7a7060', border: '1px solid #2a2520' }}
          >
            16th note grid
          </div>
        </div>
      </div>

      {/* Beat headers */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-16" />
        {BEATS.map(b => (
          <div key={b} className="flex gap-0.5">
            {SUBDIVISIONS.map(s => (
              <div
                key={s}
                className="text-xs text-center"
                style={{
                  width: '14px',
                  color: s === 0 ? '#b5651d' : '#3a3028',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                }}
              >
                {s === 0 ? b + 1 : '·'}
              </div>
            ))}
            {b < 3 && <div style={{ width: '5px' }} />}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <DrumRow label="Hi-Hat" hits={hihatHits} color="#8b9d5f" />
        <DrumRow label="Snare" hits={snareHits} color="#6b8cba" />
        <DrumRow label="Kick" hits={kickHits} color="#d4943d" />
      </div>

      {drums.pattern.length === 0 && kickHits.length === 0 && (
        <p className="text-xs mt-3" style={{ color: '#7a7060' }}>No drum pattern detected</p>
      )}
    </div>
  );
}
