'use client';

import { useState, useRef, useCallback } from 'react';
import { TranscriptionResult, TranscriptionPhase } from '@/types/transcription';

export interface YouTubeTranscribeOptions {
  url: string;
  segmentStart?: number;
  segmentEnd?: number;
  melodySource?: string;
  includeBassForLow?: boolean;
}

export interface TranscribeState {
  phase: TranscriptionPhase;
  message: string;
  result: TranscriptionResult | null;
  error: string | null;
  errorCode: string | null;
  elapsedSeconds: number;
}

export function useTranscribeYouTube() {
  const [state, setState] = useState<TranscribeState>({
    phase: 'idle', message: '', result: null, error: null, errorCode: null, elapsedSeconds: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setState(p => ({ ...p, elapsedSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000) }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const transcribe = useCallback(async (opts: YouTubeTranscribeOptions) => {
    setState({ phase: 'connecting', message: 'Connecting...', result: null, error: null, errorCode: null, elapsedSeconds: 0 });
    startTimer();

    try {
      const res = await fetch('/api/transcribe-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: opts.url,
          segment_start: opts.segmentStart,
          segment_end: opts.segmentEnd,
          melody_source: opts.melodySource ?? 'auto',
          include_bass_for_low: opts.includeBassForLow ?? false,
        }),
        signal: AbortSignal.timeout(310000),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(trimmed.slice(6)) as {
              phase: string; message?: string; result?: TranscriptionResult; code?: string;
            };
            if (event.phase === 'done' && event.result) {
              stopTimer();
              setState({ phase: 'done', message: 'Complete', result: event.result, error: null, errorCode: null, elapsedSeconds: 0 });
            } else if (event.phase === 'error') {
              stopTimer();
              setState(p => ({ ...p, phase: 'error', error: event.message ?? 'Transcription failed', errorCode: event.code ?? null }));
            } else {
              startTimeRef.current = Date.now();
              setState(p => ({ ...p, phase: event.phase as TranscriptionPhase, message: event.message ?? '', elapsedSeconds: 0 }));
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      stopTimer();
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setState(p => ({ ...p, phase: 'error', error: msg.includes('timeout') ? 'Request timed out. Please try again.' : msg }));
    }
  }, [startTimer, stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setState({ phase: 'idle', message: '', result: null, error: null, errorCode: null, elapsedSeconds: 0 });
  }, [stopTimer]);

  return { ...state, transcribe, reset };
}
