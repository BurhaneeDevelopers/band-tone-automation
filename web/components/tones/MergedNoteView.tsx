'use client';

import { Transcription, MelodicInstrumentKey, INSTRUMENT_DISPLAY, TranscriptionNote } from '@/types/transcription';
import { NoteChip } from '@/components/results/NoteChip';

interface MergedNoteViewProps {
  segments: Transcription[];
  instrumentKey: MelodicInstrumentKey;
}

export function MergedNoteView({ segments, instrumentKey }: MergedNoteViewProps) {
  const display = INSTRUMENT_DISPLAY[instrumentKey];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="text-xs font-bold"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: display.color,
            letterSpacing: '0.1em',
          }}
        >
          {display.abbr}
        </div>
        <h4
          className="font-bold text-sm"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}
        >
          {display.name}
        </h4>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {segments.map((seg, segIdx) => {
          const inst = seg.result_json?.instruments?.[instrumentKey];
          if (!inst || !('notes' in inst)) return null;
          return (
            <div key={seg.id} className="contents">
              {segIdx > 0 && (
                <div
                  className="flex items-center gap-1 w-full my-1"
                  style={{ color: '#7a7060', fontSize: '10px', fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  <div style={{ height: '1px', flex: 1, background: '#2a2520' }} />
                  <span>Segment {seg.segment_number} starts here</span>
                  <div style={{ height: '1px', flex: 1, background: '#2a2520' }} />
                </div>
              )}
              {inst.notes.map((note: TranscriptionNote, noteIdx: number) => (
                <NoteChip key={`${seg.id}-${noteIdx}`} note={note} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
