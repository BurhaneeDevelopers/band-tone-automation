'use client';

import { TranscriptionNote } from '@/types/transcription';
import { NoteChip } from './NoteChip';

interface NoteGridProps {
  notes: TranscriptionNote[];
}

const NOTES_PER_ROW = 8;

export function NoteGrid({ notes }: NoteGridProps) {
  if (notes.length === 0) {
    return (
      <p className="text-sm" style={{ color: '#7a7060' }}>No notes detected</p>
    );
  }

  // Build rows of 8
  const rows: TranscriptionNote[][] = [];
  for (let i = 0; i < notes.length; i += NOTES_PER_ROW) {
    rows.push(notes.slice(i, i + NOTES_PER_ROW));
  }

  // Timeline: roughly estimate seconds per row
  const totalDuration = notes[notes.length - 1]?.end ?? 0;
  const secondsPerRow = totalDuration / rows.length;

  return (
    <div className="space-y-1 overflow-y-auto max-h-64">
      {rows.map((row, rowIdx) => {
        const rowStart = row[0]?.start ?? 0;
        return (
          <div key={rowIdx}>
            {rowIdx === 0 || Math.floor(rowStart / 5) > Math.floor((rows[rowIdx - 1]?.[0]?.start ?? 0) / 5) ? (
              <div
                className="text-xs mb-0.5"
                style={{ color: '#7a7060', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {rowStart.toFixed(0)}s
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1">
              {row.map((note, noteIdx) => (
                <NoteChip key={`${rowIdx}-${noteIdx}`} note={note} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
