'use client';

import { TranscriptionNote, ALL_SARGAM, SargamSyllable, getSargamType } from '@/types/transcription';

interface NoteEditorProps {
  note: TranscriptionNote | null;
  noteIndex: number;
  instrumentKey: string;
  onUpdateSargam: (sargam: string) => void;
  onDelete: () => void;
}

export function NoteEditor({ note, noteIndex, instrumentKey, onUpdateSargam, onDelete }: NoteEditorProps) {
  if (!note) {
    return (
      <div className="p-5 text-center" style={{ color: '#7a7060' }}>
        <p className="text-sm">Click a note in the timeline to edit it</p>
      </div>
    );
  }

  const typeColor = (s: SargamSyllable) => {
    const t = getSargamType(s);
    if (t === 'tivra') return { bg: 'linear-gradient(135deg,#d4943d,#f0c060)', color: '#0a0a08' };
    if (t === 'komal') return { bg: 'transparent', color: '#d4943d', border: '1px solid #b5651d' };
    if (t === 'sa') return { bg: '#8b4c15', color: '#f0ebe0' };
    return { bg: '#b5651d', color: '#0a0a08' };
  };

  return (
    <div className="p-4 space-y-4">
      {/* Current note info */}
      <div className="space-y-1">
        <div className="text-xs" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Selected Note #{noteIndex + 1}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#b5651d' }}>
            {note.sargam}
          </span>
          <div className="text-xs" style={{ color: '#7a7060', fontFamily: "'JetBrains Mono', monospace" }}>
            <div>{note.note} · {note.start.toFixed(2)}s–{note.end.toFixed(2)}s</div>
            <div>{Math.round(note.duration * 1000)}ms · {Math.round(note.confidence * 100)}% conf</div>
            <div style={{ color: note.source === 'filler' ? '#d4943d' : '#7a7060' }}>{note.source}</div>
          </div>
        </div>
      </div>

      {/* Sargam grid */}
      <div>
        <div className="text-xs mb-2" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Reassign Sargam
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {ALL_SARGAM.map(s => {
            const styles = typeColor(s);
            const isActive = note.sargam.replace(/[',]/g, '') === s;
            return (
              <button
                key={s}
                onClick={() => onUpdateSargam(s)}
                className="rounded-lg py-2 text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: styles.bg,
                  color: styles.color,
                  border: styles.border ?? (isActive ? '2px solid #f0ebe0' : 'none'),
                  boxShadow: isActive ? '0 0 0 2px #b5651d' : 'none',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Octave controls */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const base = note.sargam.replace(/[',]/g, '');
            onUpdateSargam(base + "'");
          }}
          className="flex-1 py-2 text-xs font-semibold rounded"
          style={{ background: '#1a1a14', border: '1px solid #2a2520', color: '#c8bfa8', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Octave Up ↑
        </button>
        <button
          onClick={() => {
            const base = note.sargam.replace(/[',]/g, '');
            onUpdateSargam(base + ",");
          }}
          className="flex-1 py-2 text-xs font-semibold rounded"
          style={{ background: '#1a1a14', border: '1px solid #2a2520', color: '#c8bfa8', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Octave Down ↓
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full py-2 text-xs font-semibold rounded transition-all hover:opacity-80"
        style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', color: '#e74c3c', fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        Delete Note
      </button>
    </div>
  );
}
