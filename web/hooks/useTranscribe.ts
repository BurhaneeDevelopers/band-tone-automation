'use client';

import { useState, useRef, useCallback } from 'react';
import { TranscriptionResult, TranscriptionPhase } from '@/types/transcription';

export interface TranscribeOptions {
  file: File;
  key?: string;
}

export interface TranscribeState {
  phase: TranscriptionPhase;
  result: TranscriptionResult | null;
  error: string | null;
  elapsedSeconds: number;
}

export function useTranscribe() {
  const [state, setState] = useState<TranscribeState>({
    phase: 'idle',
    result: null,
    error: null,
    elapsedSeconds: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prev => ({ ...prev, elapsedSeconds: elapsed }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    setState(prev => ({ ...prev, elapsedSeconds: 0 }));
    startTimer();
  }, [stopTimer, startTimer]);

  const transcribe = useCallback(async ({ file, key }: TranscribeOptions) => {
    setState({ phase: 'connecting', result: null, error: null, elapsedSeconds: 0 });
    startTimer();

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (key && key !== 'auto') formData.append('key', key);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120000),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const event = JSON.parse(jsonStr) as {
              phase: string;
              result?: TranscriptionResult;
              message?: string;
            };

            if (event.phase === 'connecting') {
              setState(prev => ({ ...prev, phase: 'connecting' }));
            } else if (event.phase === 'processing') {
              resetTimer();
              setState(prev => ({ ...prev, phase: 'processing', elapsedSeconds: 0 }));
            } else if (event.phase === 'done' && event.result) {
              stopTimer();
              setState({
                phase: 'done',
                result: event.result,
                error: null,
                elapsedSeconds: 0,
              });
            } else if (event.phase === 'error') {
              stopTimer();
              setState(prev => ({
                ...prev,
                phase: 'error',
                error: event.message ?? 'Transcription failed',
              }));
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      stopTimer();
      const message = err instanceof Error ? err.message : 'Unknown error';
      const isTimeout = message.includes('timeout') || message.includes('abort');
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: isTimeout
          ? 'The service took too long to respond. This can happen after a long period of inactivity. Please try again — it should be faster now.'
          : message,
      }));
    }
  }, [startTimer, stopTimer, resetTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setState({ phase: 'idle', result: null, error: null, elapsedSeconds: 0 });
  }, [stopTimer]);

  return { ...state, transcribe, reset };
}
