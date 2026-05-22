// ─── Drum types ────────────────────────────────────────────────────────────

export interface DrumHit {
  beat: number;
  subdivision: number;
  type?: 'snare' | 'hihat' | 'hihat_open';
  velocity: number;
  time?: number;
}

export interface DrumInstrumentResult {
  label: string;
  bpm: number;
  pattern: DrumHit[];
}

// ─── Melodic note ──────────────────────────────────────────────────────────

export interface TranscriptionNote {
  start: number;
  end: number;
  duration: number;
  sargam: string;
  note: string;
  midi: number;
  velocity: number;
  source: 'melody' | 'filler';
  confidence: number;
}

// ─── Melodic instrument result ─────────────────────────────────────────────

export interface InstrumentResult {
  label: string;
  written_key: string;
  transposition: number;
  notes: TranscriptionNote[];
}

// ─── Full transcription result ─────────────────────────────────────────────

export interface TranscriptionResult {
  original_key: string;
  transposed_to: 'C';
  detected_bpm: number;
  duration: number;
  note_count: number;
  filler_count: number;
  separation_quality: 'good' | 'fair' | 'poor';
  instruments: {
    trumpet: InstrumentResult;
    alto_saxophone: InstrumentResult;
    trombone: InstrumentResult;
    euphonium: InstrumentResult;
    drums: DrumInstrumentResult;
    bass_drum: DrumInstrumentResult;
  };
}

export type MelodicInstrumentKey = 'trumpet' | 'alto_saxophone' | 'trombone' | 'euphonium';
export type InstrumentKey = MelodicInstrumentKey | 'drums' | 'bass_drum';

// ─── SSE Phase ─────────────────────────────────────────────────────────────

export type TranscriptionPhase =
  | 'idle'
  | 'connecting'
  | 'processing'
  | 'downloading'
  | 'separating'
  | 'transcribing'
  | 'drums'
  | 'mapping'
  | 'done'
  | 'error';

export interface PhaseEvent {
  phase: TranscriptionPhase;
  message?: string;
  result?: TranscriptionResult;
  code?: string;
}

// ─── DB models ──────────────────────────────────────────────────────────────

export interface ToneGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  song_title: string | null;
  song_artist: string | null;
  created_at: string;
}

export interface Transcription {
  id: string;
  user_id: string;
  title: string;
  source_type: 'youtube' | 'upload';
  source_url: string | null;
  original_key: string;
  duration: number;
  note_count: number;
  audio_file_path: string | null;
  stems_paths: Record<string, string> | null;
  result_json: TranscriptionResult;
  drum_pattern_json: unknown | null;
  verified: boolean;
  segment_number: number;
  tone_group_id: string | null;
  created_at: string;
}

export interface ManualCorrection {
  id: string;
  transcription_id: string;
  instrument: string;
  note_index: number;
  original_sargam: string | null;
  corrected_sargam: string | null;
  corrected_by: string;
  created_at: string;
}

export interface ToneGroupWithSegments extends ToneGroup {
  transcriptions: Transcription[];
  segment_count: number;
}

// ─── UI display config ──────────────────────────────────────────────────────

export const INSTRUMENT_DISPLAY: Record<MelodicInstrumentKey, { name: string; color: string; abbr: string }> = {
  trumpet: { name: 'Trumpet', color: '#d4943d', abbr: 'TPT' },
  alto_saxophone: { name: 'Alto Saxophone', color: '#8b9d5f', abbr: 'ALT SAX' },
  trombone: { name: 'Trombone', color: '#6b8cba', abbr: 'TBN' },
  euphonium: { name: 'Euphonium', color: '#9b7cb0', abbr: 'EUP' },
};

export const ALL_KEYS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];

export const PHASE_LABELS: Record<TranscriptionPhase, string> = {
  idle: '',
  connecting: 'Connecting to transcription service...',
  processing: 'Processing audio file...',
  downloading: 'Downloading audio from YouTube...',
  separating: 'Separating audio stems with AI...',
  transcribing: 'Detecting melody notes...',
  drums: 'Analysing drum pattern...',
  mapping: 'Mapping notes to sargam in C...',
  done: 'Complete',
  error: 'Error',
};

export const MELODIC_INSTRUMENTS: MelodicInstrumentKey[] = [
  'trumpet', 'alto_saxophone', 'trombone', 'euphonium',
];

// ─── Sargam helpers ─────────────────────────────────────────────────────────

export function getSargamType(sargam: string): 'shuddha' | 'komal' | 'tivra' | 'sa' {
  const base = sargam.replace(/[',]/g, '');
  if (base === 'Sa') return 'sa';
  if (base === 'Ma+') return 'tivra';
  if (base.length > 0 && base[0] === base[0].toLowerCase() && base !== 'Sa') return 'komal';
  return 'shuddha';
}

export function getOctaveModifier(sargam: string): 'upper' | 'lower' | 'tonic' {
  if (sargam.includes("'")) return 'upper';
  if (sargam.includes(',')) return 'lower';
  return 'tonic';
}

export const ALL_SARGAM = ['Sa', 're', 'Re', 'ga', 'Ga', 'Ma', 'Ma+', 'Pa', 'dha', 'Dha', 'ni', 'Ni'] as const;
export type SargamSyllable = typeof ALL_SARGAM[number];
