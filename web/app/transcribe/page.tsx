'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { YouTubeInput } from '@/components/input/YouTubeInput';
import { UploadZone } from '@/components/upload/UploadZone';
import { TranscribeSettings } from '@/components/input/TranscribeSettings';
import { InstrumentPanel } from '@/components/results/InstrumentPanel';
import { DrumPanel } from '@/components/results/DrumPanel';
import { FillerBanner } from '@/components/results/FillerBanner';
import { ExportControls } from '@/components/results/ExportControls';
import { useTranscribeYouTube } from '@/hooks/useTranscribeYouTube';
import { useTranscribeFile } from '@/hooks/useTranscribeFile';
import { useSaveTranscription } from '@/hooks/useSaveTranscription';
import { useToneGroups } from '@/hooks/useToneGroups';
import { MELODIC_INSTRUMENTS, PHASE_LABELS, TranscriptionPhase, INSTRUMENT_DISPLAY } from '@/types/transcription';
import { toast } from 'sonner';
import Link from 'next/link';

const PHASE_ORDER: TranscriptionPhase[] = ['connecting', 'downloading', 'separating', 'transcribing', 'drums', 'mapping'];

function PhaseIndicator({ current }: { current: TranscriptionPhase }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {PHASE_ORDER.map((p, i) => {
        const idx = PHASE_ORDER.indexOf(current);
        const done = i < idx;
        const active = p === current;
        return (
          <div key={p} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: done ? '#b5651d' : active ? '#d4943d' : '#2a2520' }}
            />
            {i < PHASE_ORDER.length - 1 && (
              <div style={{ width: '16px', height: '1px', background: done ? '#b5651d' : '#2a2520' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TranscribePage() {
  const [inputTab, setInputTab] = useState<'youtube' | 'upload'>('youtube');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [segStart, setSegStart] = useState('');
  const [segEnd, setSegEnd] = useState('');
  const [segmentLabel, setSegmentLabel] = useState('');
  const [melodySource, setMelodySource] = useState('auto');
  const [includeBass, setIncludeBass] = useState(false);
  const [toneGroupId, setToneGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const yt = useTranscribeYouTube();
  const fileT = useTranscribeFile();
  const saveMutation = useSaveTranscription();
  const { data: toneGroups = [] } = useToneGroups();

  const active = inputTab === 'youtube' ? yt : fileT;
  const { phase, message, result, error, errorCode, elapsedSeconds } = active;
  const isLoading = ['connecting', 'downloading', 'separating', 'transcribing', 'drums', 'mapping'].includes(phase);

  useEffect(() => { setBannerDismissed(sessionStorage.getItem('banner_dismissed') === '1'); }, []);

  const handleTranscribe = () => {
    setSavedId(null);
    if (inputTab === 'youtube') {
      if (!youtubeUrl) return toast.error('Enter a YouTube URL');
      yt.transcribe({
        url: youtubeUrl,
        segmentStart: segStart ? parseFloat(segStart) : undefined,
        segmentEnd: segEnd ? parseFloat(segEnd) : (segStart ? undefined : 60),
        melodySource, includeBassForLow: includeBass,
      });
    } else {
      if (!file) return toast.error('Select an audio file');
      fileT.transcribe({ file, melodySource, includeBassForLow: includeBass });
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const saved = await saveMutation.mutateAsync({
        title: segmentLabel || songTitle || (inputTab === 'upload' ? (file?.name.replace(/\.[^.]+$/, '') ?? 'Transcription') : 'YouTube Transcription'),
        result,
        audioFile: inputTab === 'upload' && file ? file : undefined,
        toneGroupId: toneGroupId !== 'new' ? toneGroupId || undefined : undefined,
        newGroupName: toneGroupId === 'new' ? newGroupName : undefined,
        sourceType: inputTab === 'youtube' ? 'youtube' : 'upload',
        sourceUrl: inputTab === 'youtube' ? youtubeUrl : undefined,
        songTitle: songTitle || undefined,
        songArtist: songArtist || undefined,
      });
      setSavedId(saved.id);
      const groupName = toneGroupId === 'new' ? newGroupName : toneGroups.find(g => g.id === toneGroupId)?.name ?? 'your tone group';
      toast.success(`Saved to ${groupName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const dismissBanner = () => { setBannerDismissed(true); sessionStorage.setItem('banner_dismissed', '1'); };

  const ERROR_MESSAGES: Record<string, string> = {
    yt_geo_blocked: 'This video is not available in the server\'s region.',
    yt_private: 'This video is private and cannot be downloaded.',
    yt_age_restricted: 'This video is age-restricted. The server needs YouTube authentication to download it.',
    yt_download_failed: 'YouTube download failed. The video may be unavailable or require authentication.',
    yt_too_long: 'Video exceeds the 5-minute limit. Please use the segment range to select a portion.',
    no_notes: 'No pitched notes were detected in the audio. Try a different melody source.',
    separation_failed: 'Stem separation failed. The service may be under memory pressure — please retry.',
    file_too_large: 'File exceeds the 50MB limit.',
    unsupported_format: 'Unsupported audio format.',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: '6px 6px 0 0', fontSize: '13px', fontWeight: 700,
    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.07em', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? '#111109' : 'transparent',
    color: active ? '#b5651d' : '#7a7060',
    border: active ? '1px solid #2a2520' : '1px solid transparent',
    borderBottom: active ? '1px solid #111109' : '1px solid #2a2520',
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}>
            TRANSCRIBE
          </h1>
          <p className="text-sm mt-1" style={{ color: '#7a7060' }}>
            Upload audio or paste a YouTube link to get sargam notation for all band instruments
          </p>
        </div>

        {/* Input tabs */}
        <div>
          <div className="flex gap-1 mb-0" style={{ borderBottom: '1px solid #2a2520' }}>
            <button style={tabStyle(inputTab === 'youtube')} onClick={() => setInputTab('youtube')}>YouTube URL</button>
            <button style={tabStyle(inputTab === 'upload')} onClick={() => setInputTab('upload')}>Upload File</button>
          </div>
          <div className="p-4 rounded-b-lg rounded-tr-lg" style={{ background: '#111109', border: '1px solid #2a2520', borderTop: 'none' }}>
            {inputTab === 'youtube' ? (
              <YouTubeInput
                url={youtubeUrl} onUrlChange={setYoutubeUrl}
                segmentStart={segStart} onSegmentStartChange={setSegStart}
                segmentEnd={segEnd} onSegmentEndChange={setSegEnd}
              />
            ) : (
              <UploadZone onFile={setFile} currentFile={file} />
            )}
          </div>
        </div>

        {/* Settings */}
        <TranscribeSettings
          segmentLabel={segmentLabel} onSegmentLabelChange={setSegmentLabel}
          melodySource={melodySource} onMelodySourceChange={setMelodySource}
          includeBassForLow={includeBass} onIncludeBassForLowChange={setIncludeBass}
          toneGroupId={toneGroupId} onToneGroupChange={(id, name) => { setToneGroupId(id); if (name) setNewGroupName(name); }}
          toneGroups={toneGroups}
          songTitle={songTitle} onSongTitleChange={setSongTitle}
          songArtist={songArtist} onSongArtistChange={setSongArtist}
        />

        {/* Warning banner */}
        {!bannerDismissed && (
          <div className="rounded-lg px-4 py-3 flex items-center justify-between gap-3" style={{ background: 'rgba(181, 101, 29, 0.08)', border: '1px solid rgba(181, 101, 29, 0.2)' }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b5651d" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <p className="text-xs" style={{ color: '#c8bfa8' }}>
                First transcription may take up to 60s to connect. Stem separation takes an additional 1–2 minutes.
              </p>
            </div>
            <button onClick={dismissBanner} className="text-xs shrink-0" style={{ color: '#7a7060' }}>×</button>
          </div>
        )}

        {/* Transcribe button */}
        <button
          onClick={handleTranscribe}
          disabled={isLoading}
          className="w-full py-4 rounded-lg font-black text-base transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#0a0a08]/30 border-t-[#0a0a08] rounded-full animate-spin" />
              Processing...
            </span>
          ) : 'Transcribe'}
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="rounded-lg p-6 space-y-3" style={{ background: '#111109', border: '1px solid #2a2520' }}>
            <div className="flex items-center gap-3">
              {phase === 'connecting' ? (
                <div className="breathing-dot w-3 h-3 rounded-full shrink-0" style={{ background: '#b5651d' }} />
              ) : (
                <div className="flex gap-1 items-center h-5">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="wave-bar" />)}
                </div>
              )}
              <div>
                <p className="text-sm" style={{ color: '#f0ebe0' }}>
                  {phase === 'connecting'
                    ? elapsedSeconds < 8 ? 'Connecting to transcription service...'
                      : elapsedSeconds < 25 ? 'Service is starting up, please wait...'
                      : 'Cold starting Railway service (up to 60s on first use)...'
                    : (message || PHASE_LABELS[phase])}
                </p>
                {phase === 'separating' && (
                  <p className="text-xs mt-1" style={{ color: '#7a7060' }}>
                    Stem separation is the slowest step. A 30s clip typically takes 60–90 seconds.
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs" style={{ color: '#7a7060', fontFamily: "'JetBrains Mono', monospace" }}>
              {elapsedSeconds}s elapsed
            </p>
            {['connecting', 'downloading', 'separating', 'transcribing', 'drums', 'mapping'].includes(phase) && (
              <PhaseIndicator current={phase as TranscriptionPhase} />
            )}
          </div>
        )}

        {/* Error */}
        {phase === 'error' && error && (
          <div className="rounded-lg p-5 space-y-3" style={{ background: 'rgba(192, 57, 43, 0.08)', border: '1px solid rgba(192, 57, 43, 0.3)' }}>
            <p className="text-sm font-semibold" style={{ color: '#e74c3c', fontFamily: "'Barlow Condensed', sans-serif" }}>
              Transcription Failed
            </p>
            <p className="text-sm" style={{ color: '#e74c3c' }}>
              {(errorCode && ERROR_MESSAGES[errorCode]) || error}
            </p>
            <button
              onClick={handleTranscribe}
              className="px-4 py-2 rounded text-xs font-semibold"
              style={{ background: '#c0392b', color: '#fff', fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {phase === 'done' && result && (
          <div className="space-y-5">
            {/* Meta bar */}
            <div className="rounded-lg px-4 py-3 flex flex-wrap items-center gap-5" style={{ background: '#111109', border: '1px solid #2a2520' }}>
              {[
                { label: 'Original Key', value: result.original_key },
                { label: 'Transposed To', value: result.transposed_to },
                { label: 'BPM', value: result.detected_bpm?.toFixed(0) ?? '—' },
                { label: 'Duration', value: `${result.duration.toFixed(1)}s` },
                { label: 'Notes', value: String(result.note_count) },
                { label: 'Quality', value: result.separation_quality },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="text-xs" style={{ color: '#7a7060' }}>{label} </span>
                  <span className="text-sm font-bold" style={{ color: '#b5651d', fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Filler banner */}
            <FillerBanner fillerCount={result.filler_count ?? 0} transcriptionId={savedId ?? undefined} />

            {/* Instrument panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {MELODIC_INSTRUMENTS.map(key => (
                <InstrumentPanel
                  key={key}
                  instrumentKey={key}
                  instrument={result.instruments[key]}
                  result={result}
                  title={segmentLabel || songTitle || 'Transcription'}
                />
              ))}
            </div>

            {/* Drum panel */}
            {result.instruments.drums && result.instruments.bass_drum && (
              <DrumPanel drums={result.instruments.drums} bassDrum={result.instruments.bass_drum} />
            )}

            {/* Export */}
            <ExportControls result={result} title={segmentLabel || songTitle || 'Transcription'} />

            {/* Save section */}
            <div
              className="rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{ background: 'rgba(181, 101, 29, 0.06)', border: '1px solid rgba(181, 101, 29, 0.2)' }}
            >
              <div>
                <p className="font-bold text-sm" style={{ color: '#f0ebe0', fontFamily: "'Barlow Condensed', sans-serif" }}>Save this transcription?</p>
                <p className="text-xs mt-0.5" style={{ color: '#7a7060' }}>Saves notation to your account. Set tone group and song details in Settings above.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {savedId && (
                  <Link
                    href={`/verify/${savedId}`}
                    className="px-4 py-2.5 rounded-lg font-bold text-sm"
                    style={{ border: '1px solid #b5651d', color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    Open Verification Player
                  </Link>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#b5651d', color: '#0a0a08', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}
                >
                  {saveMutation.isPending ? 'Saving...' : savedId ? 'Save Again' : 'Save to Tone Group'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
