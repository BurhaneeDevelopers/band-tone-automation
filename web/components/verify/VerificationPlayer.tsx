'use client';

import { useEffect, useRef, useState } from 'react';

interface VerificationPlayerProps {
  audioUrl: string | null;
  onCurrentTimeChange: (t: number) => void;
  onAudioElement: (el: HTMLAudioElement | null) => void;
}

const SPEEDS = [1, 0.75, 0.5, 0.25];

export function VerificationPlayer({ audioUrl, onCurrentTimeChange, onAudioElement }: VerificationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    onAudioElement(audio);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => setIsPlaying(false));

    const tick = () => {
      setCurrentTime(audio.currentTime);
      onCurrentTimeChange(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      audio.pause();
      audio.src = '';
      onAudioElement(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
  };

  const setPlaybackRate = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const formatTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  return (
    <div className="space-y-3" style={{ background: '#111109', border: '1px solid #2a2520', borderRadius: '10px', padding: '16px' }}>
      {!audioUrl && (
        <div className="text-sm text-center py-4" style={{ color: '#7a7060' }}>
          No audio available — audio is only stored when saved with a tone group
        </div>
      )}

      {/* Waveform progress bar (simplified) */}
      <div
        className="relative h-12 rounded cursor-pointer overflow-hidden"
        style={{ background: '#0e0e0b', border: '1px solid #2a2520' }}
        onClick={handleSeek}
      >
        {/* Progress fill */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: 'rgba(181, 101, 29, 0.2)',
            transition: 'width 0.1s',
          }}
        />
        {/* Static waveform bars decoration */}
        <div className="absolute inset-0 flex items-center gap-px px-1">
          {Array.from({ length: 80 }).map((_, i) => {
            const barH = 20 + Math.sin(i * 0.4) * 10 + Math.sin(i * 0.9) * 6;
            const active = i / 80 < progress;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${barH}%`,
                  background: active ? '#b5651d' : '#2a2520',
                  borderRadius: '1px',
                  transition: 'background 0.1s',
                }}
              />
            );
          })}
        </div>
        {/* Playhead */}
        <div
          style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${progress * 100}%`,
            width: '2px', background: '#b5651d',
          }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play/pause */}
        <button
          onClick={togglePlay}
          disabled={!audioUrl}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: '#b5651d' }}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a08">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a08">
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
          )}
        </button>

        {/* Time */}
        <span className="text-xs" style={{ color: '#7a7060', fontFamily: "'JetBrains Mono', monospace", minWidth: '80px' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Speed controls */}
        <div className="flex gap-1 ml-auto">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setPlaybackRate(s)}
              className="px-2 py-1 text-xs rounded transition-all"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: speed === s ? '#b5651d' : '#1e1c15',
                color: speed === s ? '#0a0a08' : '#7a7060',
                border: `1px solid ${speed === s ? '#b5651d' : '#2a2520'}`,
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
