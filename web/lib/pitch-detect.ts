/**
 * Real-time pitch detection using Web Audio API + autocorrelation.
 * Returns the current sargam note detected from mic/audio input.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SARGAM_FROM_PC: Record<string, string> = {
  C: 'Sa', 'C#': 're', D: 'Re', 'D#': 'ga', E: 'Ga', F: 'Ma',
  'F#': 'Ma+', G: 'Pa', 'G#': 'dha', A: 'Dha', 'A#': 'ni', B: 'Ni',
};

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buf[i] - buf[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }
    lastCorrelation = correlation;
  }

  if (bestOffset === -1) return -1;
  return sampleRate / bestOffset;
}

function freqToNoteName(freq: number): string | null {
  if (freq <= 0) return null;
  const noteNum = 12 * (Math.log2(freq / 440)) + 69;
  const rounded = Math.round(noteNum);
  const pc = ((rounded % 12) + 12) % 12;
  return NOTE_NAMES[pc];
}

export function freqToSargam(freq: number): string | null {
  const note = freqToNoteName(freq);
  if (!note) return null;
  return SARGAM_FROM_PC[note] ?? null;
}

export class RealtimePitchDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private rafId: number | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private onPitch: (sargam: string | null, freq: number) => void;

  constructor(cb: (sargam: string | null, freq: number) => void) {
    this.onPitch = cb;
  }

  connect(audioElement: HTMLAudioElement) {
    if (this.audioCtx) this.disconnect();
    this.audioCtx = new AudioContext();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.source = this.audioCtx.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.startLoop();
  }

  private startLoop() {
    const tick = () => {
      if (!this.analyser || !this.buf) return;
      this.analyser.getFloatTimeDomainData(this.buf);
      const freq = autoCorrelate(this.buf, this.audioCtx!.sampleRate);
      const sargam = freqToSargam(freq);
      this.onPitch(sargam, freq);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  disconnect() {
    if (this.rafId != null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    try { this.source?.disconnect(); this.analyser?.disconnect(); this.audioCtx?.close(); } catch { /* ignore */ }
    this.audioCtx = null; this.analyser = null; this.source = null;
  }
}
