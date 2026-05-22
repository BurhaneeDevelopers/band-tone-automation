'use client';

import { TranscriptionNote, getSargamType, getOctaveModifier } from '@/types/transcription';

interface NoteChipProps {
  note: TranscriptionNote;
}

export function NoteChip({ note }: NoteChipProps) {
  const type = getSargamType(note.sargam);
  const octave = getOctaveModifier(note.sargam);
  const isFiller = note.source === 'filler';
  const isLowConf = note.confidence < 0.5;

  const baseStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    cursor: 'default',
    whiteSpace: 'nowrap',
    transition: 'all 0.1s',
  };

  let chipStyle: React.CSSProperties;

  if (isFiller) {
    chipStyle = {
      ...baseStyle,
      background: 'transparent',
      border: '1.5px dashed rgba(212, 148, 61, 0.7)',
      color: '#d4943d',
      opacity: isLowConf ? 0.6 : 1,
    };
  } else if (type === 'tivra') {
    chipStyle = { ...baseStyle, background: 'linear-gradient(135deg, #d4943d, #f0c060)', color: '#0a0a08', boxShadow: '0 0 6px rgba(212,148,61,0.3)' };
  } else if (type === 'komal') {
    chipStyle = { ...baseStyle, background: 'transparent', border: '1.5px solid #b5651d', color: '#d4943d', textDecoration: 'underline', textUnderlineOffset: '2px', opacity: isLowConf ? 0.5 : 1 };
  } else if (type === 'sa') {
    chipStyle = { ...baseStyle, background: '#b5651d', color: '#0a0a08', fontWeight: 700, opacity: isLowConf ? 0.5 : 1 };
  } else {
    chipStyle = { ...baseStyle, background: '#b5651d', color: '#0a0a08', opacity: isLowConf ? 0.5 : 1 };
  }

  if (octave === 'upper') {
    chipStyle = { ...chipStyle, filter: 'brightness(1.25)' };
  } else if (octave === 'lower') {
    chipStyle = { ...chipStyle, filter: 'brightness(0.7)' };
  }

  return (
    <div className="group relative inline-block">
      <span style={chipStyle}>
        {isFiller && <span style={{ fontSize: '8px', opacity: 0.7 }}>↻</span>}
        {note.sargam}
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="rounded px-2 py-1 text-xs whitespace-nowrap border" style={{ background: '#1a1a14', borderColor: '#2a2520', color: '#c8bfa8', fontFamily: "'JetBrains Mono', monospace" }}>
          <div>{note.note} · {note.start.toFixed(2)}s</div>
          <div>{Math.round(note.duration * 1000)}ms · vel {note.velocity}</div>
          <div style={{ color: isFiller ? '#d4943d' : '#7a7060' }}>
            {isFiller ? 'filler' : 'melody'} · {Math.round(note.confidence * 100)}% conf
          </div>
        </div>
        <div className="w-0 h-0 mx-auto" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #2a2520' }} />
      </div>
    </div>
  );
}
