'use client';

import { TranscriptionNote, MELODIC_INSTRUMENTS, MelodicInstrumentKey, INSTRUMENT_DISPLAY, Transcription } from '@/types/transcription';

interface NoteTimelineProps {
  transcription: Transcription;
  currentTime: number;
  selectedNote: { instrument: MelodicInstrumentKey; index: number } | null;
  onSelectNote: (instrument: MelodicInstrumentKey, index: number) => void;
}

const PIXELS_PER_SECOND = 60;
const ROW_HEIGHT = 28;

export function NoteTimeline({ transcription, currentTime, selectedNote, onSelectNote }: NoteTimelineProps) {
  const result = transcription.result_json;
  const duration = result.duration || 30;
  const width = Math.max(duration * PIXELS_PER_SECOND, 400);

  return (
    <div className="overflow-x-auto" style={{ background: '#0e0e0b', borderRadius: '8px', border: '1px solid #2a2520', padding: '8px 0' }}>
      <div style={{ position: 'relative', width: `${width + 80}px`, minHeight: `${MELODIC_INSTRUMENTS.length * (ROW_HEIGHT + 4) + 24}px` }}>
        {/* Time ruler */}
        <div style={{ position: 'relative', height: '20px', marginLeft: '80px', marginBottom: '4px' }}>
          {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => {
            const t = i * 5;
            return (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: `${t * PIXELS_PER_SECOND}px`,
                  fontSize: '9px',
                  color: '#7a7060',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {t}s
              </div>
            );
          })}
        </div>

        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: `${80 + currentTime * PIXELS_PER_SECOND}px`,
            top: 0,
            bottom: 0,
            width: '2px',
            background: '#b5651d',
            zIndex: 10,
            opacity: 0.8,
          }}
        />

        {/* Instrument rows */}
        {MELODIC_INSTRUMENTS.map((instKey, rowIdx) => {
          const inst = result.instruments[instKey];
          const display = INSTRUMENT_DISPLAY[instKey];
          const notes: TranscriptionNote[] = inst?.notes ?? [];
          const y = 24 + rowIdx * (ROW_HEIGHT + 4);

          return (
            <div key={instKey} style={{ position: 'absolute', top: `${y}px`, left: 0, right: 0, height: `${ROW_HEIGHT}px` }}>
              {/* Label */}
              <div
                style={{
                  position: 'absolute', left: 0, width: '76px', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: '6px', fontSize: '9px', fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: display.color, letterSpacing: '0.04em',
                }}
              >
                {display.abbr}
              </div>

              {/* Row background */}
              <div
                style={{
                  position: 'absolute', left: '80px', right: 0, top: 0, bottom: 0,
                  background: '#111109', borderBottom: '1px solid #1a1a14',
                }}
              />

              {/* Note blocks */}
              {notes.map((note, noteIdx) => {
                const isSelected = selectedNote?.instrument === instKey && selectedNote?.index === noteIdx;
                const isFiller = note.source === 'filler';
                const isLowConf = note.confidence < 0.5;
                const left = 80 + note.start * PIXELS_PER_SECOND;
                const noteWidth = Math.max(note.duration * PIXELS_PER_SECOND - 1, 8);

                return (
                  <div
                    key={noteIdx}
                    onClick={() => onSelectNote(instKey, noteIdx)}
                    title={`${note.sargam} (${note.note}) ${note.start.toFixed(2)}s`}
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: '3px',
                      width: `${noteWidth}px`,
                      height: `${ROW_HEIGHT - 6}px`,
                      background: isSelected
                        ? '#f0ebe0'
                        : isFiller
                        ? 'rgba(212,148,61,0.4)'
                        : display.color + (isLowConf ? '60' : 'cc'),
                      border: isSelected
                        ? `2px solid #f0ebe0`
                        : isFiller
                        ? '1px dashed rgba(212,148,61,0.8)'
                        : `1px solid ${display.color}`,
                      borderRadius: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      fontSize: '7px',
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isSelected ? '#0a0a08' : '#f0ebe0',
                      zIndex: isSelected ? 5 : 1,
                    }}
                  >
                    {noteWidth > 16 ? note.sargam : ''}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
