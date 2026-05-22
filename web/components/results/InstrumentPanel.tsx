'use client';

import { InstrumentResult, InstrumentKey, INSTRUMENT_DISPLAY } from '@/types/transcription';
import { TranscriptionResult } from '@/types/transcription';
import { NoteGrid } from './NoteGrid';
import { ExportControls } from './ExportControls';

interface InstrumentPanelProps {
  instrumentKey: InstrumentKey;
  instrument: InstrumentResult;
  result: TranscriptionResult;
  title: string;
}

export function InstrumentPanel({ instrumentKey, instrument, result, title }: InstrumentPanelProps) {
  const display = INSTRUMENT_DISPLAY[instrumentKey];
  const transpLabel =
    instrument.transposition === 0 ? 'Concert pitch' : `+${instrument.transposition} semitones`;

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: '#111109', border: '1px solid #2a2520' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div
            className="text-xs font-bold tracking-widest mb-1"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: display.color,
              letterSpacing: '0.1em',
            }}
          >
            {display.abbr}
          </div>
          <h3
            className="text-base font-bold leading-none"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}
          >
            {instrument.label}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#1a1a14', color: '#b5651d', border: '1px solid #2a2520' }}
          >
            {transpLabel}
          </span>
          <span
            className="text-xs"
            style={{ color: '#7a7060', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Key: {instrument.written_key}
          </span>
        </div>
      </div>

      {/* Note count */}
      <div className="text-xs" style={{ color: '#7a7060' }}>
        {instrument.notes.length} notes
      </div>

      {/* Notes */}
      <NoteGrid notes={instrument.notes} />

      {/* Export */}
      <ExportControls
        result={result}
        title={title}
        instrumentKey={instrumentKey}
        variant="single"
      />
    </div>
  );
}
