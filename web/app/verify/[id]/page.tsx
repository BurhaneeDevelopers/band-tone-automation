'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { VerificationPlayer } from '@/components/verify/VerificationPlayer';
import { NoteTimeline } from '@/components/verify/NoteTimeline';
import { NoteEditor } from '@/components/verify/NoteEditor';
import { DrumGridEditor } from '@/components/verify/DrumGridEditor';
import { PitchDisplay } from '@/components/verify/PitchDisplay';
import { useSaveCorrections, useResetCorrections } from '@/hooks/useCorrections';
import {
  Transcription, MelodicInstrumentKey, MELODIC_INSTRUMENTS, INSTRUMENT_DISPLAY,
  TranscriptionNote,
} from '@/types/transcription';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

interface PendingCorrection {
  instrument: string;
  note_index: number;
  original_sargam: string | null;
  corrected_sargam: string | null;
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Fetch transcription
  const { data: transcription, isLoading } = useQuery<Transcription>({
    queryKey: queryKeys.transcription(id),
    queryFn: async () => {
      const res = await fetch(`/api/transcriptions/${id}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    enabled: !!id,
  });

  // Local editable copy of notes
  const [localNotes, setLocalNotes] = useState<Record<MelodicInstrumentKey, TranscriptionNote[]>>({
    trumpet: [], alto_saxophone: [], trombone: [], euphonium: [],
  });
  const [selectedNote, setSelectedNote] = useState<{ instrument: MelodicInstrumentKey; index: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [bpm, setBpm] = useState(120);
  const [corrections, setCorrections] = useState<PendingCorrection[]>([]);
  const [activeInstrumentTab, setActiveInstrumentTab] = useState<MelodicInstrumentKey>('trumpet');

  // Filler review mode
  const [fillerMode, setFillerMode] = useState(false);
  const [fillerQueue, setFillerQueue] = useState<{ instrument: MelodicInstrumentKey; index: number }[]>([]);
  const [fillerPos, setFillerPos] = useState(0);

  const saveMutation = useSaveCorrections(id);
  const resetMutation = useResetCorrections(id);

  // Init from fetched transcription
  useEffect(() => {
    if (!transcription) return;
    const result = transcription.result_json;
    const notes: Record<MelodicInstrumentKey, TranscriptionNote[]> = {} as Record<MelodicInstrumentKey, TranscriptionNote[]>;
    for (const key of MELODIC_INSTRUMENTS) {
      notes[key] = [...(result.instruments[key]?.notes ?? [])];
    }
    setLocalNotes(notes);
    setBpm(result.detected_bpm ?? 120);

    // Build filler queue
    const fillers: { instrument: MelodicInstrumentKey; index: number }[] = [];
    for (const key of MELODIC_INSTRUMENTS) {
      (notes[key] ?? []).forEach((n, i) => {
        if (n.source === 'filler') fillers.push({ instrument: key, index: i });
      });
    }
    setFillerQueue(fillers);
  }, [transcription]);

  // Get audio URL from Supabase storage
  useEffect(() => {
    if (!transcription?.audio_file_path) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage.from('audio-uploads').createSignedUrl(transcription.audio_file_path!, 3600);
      if (data?.signedUrl) setAudioUrl(data.signedUrl);
    })();
  }, [transcription?.audio_file_path]);

  const handleSelectNote = useCallback((instrument: MelodicInstrumentKey, index: number) => {
    setSelectedNote({ instrument, index });
    setActiveInstrumentTab(instrument);
    // Seek audio to note start
    const note = localNotes[instrument]?.[index];
    if (note && audioElement) {
      audioElement.currentTime = note.start;
    }
  }, [localNotes, audioElement]);

  const handleUpdateSargam = useCallback((newSargam: string) => {
    if (!selectedNote) return;
    const { instrument, index } = selectedNote;
    setLocalNotes(prev => {
      const notes = [...prev[instrument]];
      const original = notes[index];
      notes[index] = { ...original, sargam: newSargam };
      return { ...prev, [instrument]: notes };
    });
    setCorrections(prev => {
      const existing = prev.findIndex(c => c.instrument === instrument && c.note_index === index);
      const entry: PendingCorrection = {
        instrument, note_index: index,
        original_sargam: localNotes[instrument]?.[index]?.sargam ?? null,
        corrected_sargam: newSargam,
      };
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = entry;
        return next;
      }
      return [...prev, entry];
    });
  }, [selectedNote, localNotes]);

  const handleDeleteNote = useCallback(() => {
    if (!selectedNote) return;
    const { instrument, index } = selectedNote;
    setLocalNotes(prev => {
      const notes = [...prev[instrument]];
      notes.splice(index, 1);
      return { ...prev, [instrument]: notes };
    });
    setSelectedNote(null);
  }, [selectedNote]);

  const handleSaveCorrections = async () => {
    if (corrections.length === 0) {
      toast.info('No corrections to save');
      return;
    }
    try {
      await saveMutation.mutateAsync(corrections);
      toast.success(`${corrections.length} correction${corrections.length !== 1 ? 's' : ''} saved`);
      setCorrections([]);
    } catch {
      toast.error('Failed to save corrections');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all manual corrections for this segment?')) return;
    try {
      await resetMutation.mutateAsync();
      setCorrections([]);
      toast.success('Corrections reset');
    } catch {
      toast.error('Failed to reset');
    }
  };

  // Filler review mode
  const startFillerReview = () => {
    if (fillerQueue.length === 0) return toast.info('No filler notes to review');
    setFillerMode(true);
    setFillerPos(0);
    const first = fillerQueue[0];
    handleSelectNote(first.instrument, first.index);
  };

  const advanceFiller = (action: 'keep' | 'delete') => {
    if (action === 'keep' && selectedNote) {
      handleUpdateSargam(localNotes[selectedNote.instrument]?.[selectedNote.index]?.sargam ?? 'Sa');
    } else if (action === 'delete') {
      handleDeleteNote();
    }
    const next = fillerPos + 1;
    if (next >= fillerQueue.length) {
      setFillerMode(false);
      toast.success('Filler review complete');
    } else {
      setFillerPos(next);
      const nxt = fillerQueue[next];
      handleSelectNote(nxt.instrument, nxt.index);
    }
  };

  const selectedNoteObj = selectedNote ? localNotes[selectedNote.instrument]?.[selectedNote.index] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: '#7a7060' }}>Loading...</div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: '#e74c3c' }}>Transcription not found</div>
      </div>
    );
  }

  const totalFillers = MELODIC_INSTRUMENTS.reduce((sum, k) => sum + (localNotes[k] ?? []).filter(n => n.source === 'filler').length, 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/tones" className="text-xs" style={{ color: '#7a7060' }}>← Tones</Link>
            </div>
            <h1 className="text-2xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
              VERIFICATION PLAYER
            </h1>
            <p className="text-sm" style={{ color: '#7a7060' }}>{transcription.title}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {totalFillers > 0 && !fillerMode && (
              <button
                onClick={startFillerReview}
                className="px-4 py-2 text-xs font-bold rounded"
                style={{ background: 'rgba(212,148,61,0.1)', border: '1px solid rgba(212,148,61,0.4)', color: '#d4943d', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}
              >
                Review {totalFillers} Fillers
              </button>
            )}
            <button
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="px-4 py-2 text-xs font-bold rounded"
              style={{ border: '1px solid #2a2520', color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase' }}
            >
              Reset to AI
            </button>
            <button
              onClick={handleSaveCorrections}
              disabled={saveMutation.isPending || corrections.length === 0}
              className="px-5 py-2 text-sm font-bold rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {saveMutation.isPending ? 'Saving...' : `Save ${corrections.length > 0 ? `(${corrections.length})` : ''} Corrections`}
            </button>
          </div>
        </div>

        {/* Filler review banner */}
        {fillerMode && (
          <div className="rounded-lg px-4 py-3 flex items-center justify-between gap-4" style={{ background: 'rgba(212,148,61,0.08)', border: '1px solid rgba(212,148,61,0.4)' }}>
            <p className="text-sm font-semibold" style={{ color: '#d4943d' }}>
              Reviewing filler {fillerPos + 1} of {fillerQueue.length} — {selectedNoteObj?.sargam ?? '?'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => advanceFiller('keep')} className="px-4 py-1.5 text-xs font-bold rounded" style={{ background: '#1a3020', border: '1px solid #2a5030', color: '#5db87a', fontFamily: "'Barlow Condensed', sans-serif" }}>Keep</button>
              <button onClick={() => { setSelectedNote(selectedNote); setFillerMode(false); }} className="px-4 py-1.5 text-xs font-bold rounded" style={{ background: '#1a1a14', border: '1px solid #2a2520', color: '#c8bfa8', fontFamily: "'Barlow Condensed', sans-serif" }}>Fix</button>
              <button onClick={() => advanceFiller('delete')} className="px-4 py-1.5 text-xs font-bold rounded" style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', color: '#e74c3c', fontFamily: "'Barlow Condensed', sans-serif" }}>Delete</button>
              <button onClick={() => setFillerMode(false)} className="px-3 py-1.5 text-xs" style={{ color: '#7a7060' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Main split layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Left 60% — player + timeline */}
          <div className="xl:col-span-3 space-y-4">
            {/* Player + pitch display */}
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <VerificationPlayer
                  audioUrl={audioUrl}
                  onCurrentTimeChange={setCurrentTime}
                  onAudioElement={setAudioElement}
                />
              </div>
              <PitchDisplay audioElement={audioElement} />
            </div>

            {/* Note timeline */}
            <div>
              <div className="text-xs mb-2 font-semibold" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Note Timeline
              </div>
              <NoteTimeline
                transcription={{ ...transcription, result_json: { ...transcription.result_json, instruments: { ...transcription.result_json.instruments, ...Object.fromEntries(MELODIC_INSTRUMENTS.map(k => [k, { ...transcription.result_json.instruments[k], notes: localNotes[k] }])) } } }}
                currentTime={currentTime}
                selectedNote={selectedNote}
                onSelectNote={handleSelectNote}
              />
            </div>

            {/* Drum grid editor */}
            {transcription.result_json.instruments.drums && (
              <div className="rounded-lg p-4" style={{ background: '#111109', border: '1px solid #2a2520' }}>
                <div className="text-xs font-semibold mb-3" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Drum Pattern Editor
                </div>
                <DrumGridEditor
                  drums={transcription.result_json.instruments.drums}
                  bassDrum={transcription.result_json.instruments.bass_drum}
                  bpm={bpm}
                  onBpmChange={setBpm}
                />
              </div>
            )}
          </div>

          {/* Right 40% — note editor */}
          <div className="xl:col-span-2 space-y-3">
            {/* Instrument tabs */}
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2520' }}>
              <div className="flex" style={{ background: '#0e0e0b', borderBottom: '1px solid #2a2520' }}>
                {MELODIC_INSTRUMENTS.map(k => {
                  const display = INSTRUMENT_DISPLAY[k];
                  const active = activeInstrumentTab === k;
                  const noteCount = localNotes[k]?.length ?? 0;
                  const fillerCount = localNotes[k]?.filter(n => n.source === 'filler').length ?? 0;
                  return (
                    <button
                      key={k}
                      onClick={() => setActiveInstrumentTab(k)}
                      className="flex-1 py-2.5 text-xs font-bold transition-colors"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: active ? display.color : '#7a7060',
                        background: active ? '#111109' : 'transparent',
                        borderBottom: active ? `2px solid ${display.color}` : '2px solid transparent',
                      }}
                    >
                      {display.abbr}
                      {fillerCount > 0 && (
                        <span className="ml-1" style={{ color: '#d4943d', fontSize: '8px' }}>●</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Note list */}
              <div style={{ background: '#111109', maxHeight: '200px', overflowY: 'auto', padding: '8px' }}>
                <div className="flex flex-wrap gap-1">
                  {(localNotes[activeInstrumentTab] ?? []).map((note, idx) => {
                    const isSelected = selectedNote?.instrument === activeInstrumentTab && selectedNote?.index === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectNote(activeInstrumentTab, idx)}
                        className="text-xs rounded-full px-2 py-0.5 transition-all"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          background: isSelected ? '#f0ebe0' : note.source === 'filler' ? 'rgba(212,148,61,0.15)' : '#1e1c15',
                          color: isSelected ? '#0a0a08' : note.source === 'filler' ? '#d4943d' : '#c8bfa8',
                          border: isSelected ? '1px solid #f0ebe0' : note.source === 'filler' ? '1px dashed rgba(212,148,61,0.5)' : '1px solid #2a2520',
                        }}
                      >
                        {note.sargam}
                      </button>
                    );
                  })}
                  {(localNotes[activeInstrumentTab] ?? []).length === 0 && (
                    <p className="text-xs" style={{ color: '#7a7060' }}>No notes</p>
                  )}
                </div>
              </div>

              {/* Note editor */}
              <div style={{ borderTop: '1px solid #2a2520' }}>
                <NoteEditor
                  note={selectedNote?.instrument === activeInstrumentTab ? selectedNoteObj : null}
                  noteIndex={selectedNote?.instrument === activeInstrumentTab ? (selectedNote?.index ?? 0) : 0}
                  instrumentKey={activeInstrumentTab}
                  onUpdateSargam={handleUpdateSargam}
                  onDelete={handleDeleteNote}
                />
              </div>
            </div>

            {/* Unsaved corrections badge */}
            {corrections.length > 0 && (
              <div className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(181,101,29,0.1)', border: '1px solid rgba(181,101,29,0.2)', color: '#b5651d' }}>
                {corrections.length} unsaved correction{corrections.length !== 1 ? 's' : ''} — click "Save Corrections" to apply
              </div>
            )}

            {/* Verified badge */}
            {transcription.verified && corrections.length === 0 && (
              <div className="text-xs px-3 py-2 rounded flex items-center gap-2" style={{ background: 'rgba(42,100,60,0.1)', border: '1px solid rgba(42,100,60,0.3)', color: '#5db87a' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Verified — corrections saved
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
