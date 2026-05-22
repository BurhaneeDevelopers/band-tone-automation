'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { formatFileSize } from '@/lib/utils';

interface UploadZoneProps {
  onFile: (file: File) => void;
  currentFile: File | null;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/flac': ['.flac'],
  'audio/x-m4a': ['.m4a'],
  'audio/mp4': ['.m4a'],
  'audio/aac': ['.aac'],
};

const MAX_SIZE = 50 * 1024 * 1024;
const WARN_SIZE = 30 * 1024 * 1024;

export function UploadZone({ onFile, currentFile }: UploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError('File exceeds 50MB limit. Please trim your audio.');
      return;
    }
    onFile(file);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    maxFiles: 1,
  });

  const showWarning = currentFile && currentFile.size > WARN_SIZE;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`rounded-lg p-8 text-center cursor-pointer transition-all ${isDragActive ? 'dropzone-active' : ''}`}
        style={{
          border: `2px dashed ${isDragActive ? '#b5651d' : '#2a2520'}`,
          background: isDragActive ? 'rgba(181, 101, 29, 0.05)' : '#0e0e0b',
        }}
      >
        <input {...getInputProps()} />
        {currentFile ? (
          <div className="space-y-2">
            {/* Waveform decoration */}
            <div className="flex items-center justify-center gap-1 h-8 mb-3">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '2px',
                    height: `${8 + Math.sin(i * 0.8) * 6 + Math.random() * 10}px`,
                    background: '#b5651d',
                    borderRadius: '1px',
                    opacity: 0.7 + Math.sin(i * 0.3) * 0.3,
                  }}
                />
              ))}
            </div>
            <p className="font-semibold" style={{ color: '#f0ebe0', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', letterSpacing: '0.03em' }}>
              {currentFile.name}
            </p>
            <p className="text-sm" style={{ color: '#7a7060' }}>
              {formatFileSize(currentFile.size)}
            </p>
            <p className="text-xs" style={{ color: '#b5651d' }}>Click or drop to replace</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: '#1a1a14', border: '1px solid #2a2520' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b5651d" strokeWidth="1.5">
                <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <p className="font-semibold" style={{ color: '#f0ebe0', fontFamily: "'Barlow Condensed', sans-serif', fontSize: '15px" }}>
                {isDragActive ? 'Drop audio here' : 'Drop audio file or click to browse'}
              </p>
              <p className="text-xs mt-1" style={{ color: '#7a7060' }}>
                MP3, WAV, OGG, FLAC, M4A, AAC · Max 50MB
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: '#7a7060' }}>
        For best accuracy, use 10–30 second segments. Longer clips may reduce precision.
      </p>

      {showWarning && (
        <div
          className="rounded px-3 py-2 text-xs"
          style={{ background: 'rgba(181, 101, 29, 0.1)', border: '1px solid rgba(181, 101, 29, 0.3)', color: '#d4943d' }}
        >
          ⚠ File is over 30MB. Consider trimming the audio for better accuracy and faster processing.
        </div>
      )}

      {(error || fileRejections.length > 0) && (
        <div
          className="rounded px-3 py-2 text-xs"
          style={{ background: 'rgba(192, 57, 43, 0.1)', border: '1px solid rgba(192, 57, 43, 0.3)', color: '#e74c3c' }}
        >
          {error || 'Unsupported file type or file too large'}
        </div>
      )}
    </div>
  );
}
