'use client';

import { useState } from 'react';
import { DrumInstrumentResult, DrumHit } from '@/types/transcription';

interface DrumGridEditorProps {
  drums: DrumInstrumentResult;
  bassDrum: DrumInstrumentResult;
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

const BEATS = [0, 1, 2, 3];
const SUBDIVISIONS = [0, 1, 2, 3];

export function DrumGridEditor({ drums, bassDrum, bpm, onBpmChange }: DrumGridEditorProps) {
  const [localDrums, setLocalDrums] = useState(drums.pattern);
  const [localKick, setLocalKick] = useState(bassDrum.pattern);

  const toggleHit = (
    type: 'snare' | 'hihat' | 'kick',
    beat: number,
    subdivision: number
  ) => {
    if (type === 'kick') {
      const idx = localKick.findIndex(h => h.beat === beat && h.subdivision === subdivision);
      if (idx >= 0) {
        setLocalKick(k => k.filter((_, i) => i !== idx));
      } else {
        setLocalKick(k => [...k, { beat, subdivision, velocity: 80 }]);
      }
    } else {
      const idx = localDrums.findIndex(h => h.beat === beat && h.subdivision === subdivision && h.type === type);
      if (idx >= 0) {
        setLocalDrums(d => d.filter((_, i) => i !== idx));
      } else {
        setLocalDrums(d => [...d, { beat, subdivision, type, velocity: 80 }]);
      }
    }
  };

  const isHit = (hits: DrumHit[], beat: number, sub: number, type?: string) =>
    hits.some(h => h.beat === beat && h.subdivision === sub && (!type || h.type === type));

  const rows: { label: string; color: string; type: 'snare' | 'hihat' | 'kick'; hits: DrumHit[] }[] = [
    { label: 'Hi-Hat', color: '#8b9d5f', type: 'hihat', hits: localDrums.filter(h => h.type === 'hihat' || h.type === 'hihat_open') },
    { label: 'Snare', color: '#6b8cba', type: 'snare', hits: localDrums.filter(h => h.type === 'snare') },
    { label: 'Kick', color: '#d4943d', type: 'kick', hits: localKick },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          BPM
        </span>
        <input
          type="number"
          value={bpm}
          onChange={e => onBpmChange(parseFloat(e.target.value) || 120)}
          min="60" max="220" step="1"
          className="w-20 text-center text-sm font-bold"
          style={{ background: '#1e1c15', border: '1px solid #2a2520', borderRadius: '4px', color: '#b5651d', padding: '4px', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
        />
      </div>

      {rows.map(row => (
        <div key={row.type} className="flex items-center gap-2">
          <span className="text-xs font-semibold w-14 text-right shrink-0" style={{ color: row.color, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {row.label}
          </span>
          <div className="flex gap-1">
            {BEATS.map(beat => (
              <div key={beat} className="flex gap-0.5">
                {SUBDIVISIONS.map(sub => {
                  const hit = isHit(row.hits, beat, sub, row.type !== 'kick' ? row.type : undefined);
                  return (
                    <button
                      key={sub}
                      onClick={() => toggleHit(row.type, beat, sub)}
                      style={{
                        width: '18px', height: '18px', borderRadius: '3px',
                        background: hit ? row.color : '#1e1c15',
                        border: `1px solid ${hit ? row.color : '#2a2520'}`,
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                    />
                  );
                })}
                {beat < 3 && <div style={{ width: '3px' }} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
