'use client';

import { useState } from 'react';

interface YouTubeInputProps {
  url: string;
  onUrlChange: (v: string) => void;
  segmentStart: string;
  onSegmentStartChange: (v: string) => void;
  segmentEnd: string;
  onSegmentEndChange: (v: string) => void;
}

export function YouTubeInput({
  url, onUrlChange, segmentStart, onSegmentStartChange, segmentEnd, onSegmentEndChange,
}: YouTubeInputProps) {
  const inputStyle: React.CSSProperties = {
    background: '#1e1c15', border: '1px solid #2a2520', borderRadius: '6px',
    color: '#f0ebe0', fontSize: '13px', fontFamily: "'Barlow', sans-serif",
    padding: '8px 12px', outline: 'none', width: '100%',
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onUrlChange(text);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs mb-1.5" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          YouTube URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={inputStyle}
          />
          <button
            onClick={handlePaste}
            className="px-3 py-1.5 rounded text-xs font-semibold shrink-0"
            style={{ background: '#1e1c15', border: '1px solid #2a2520', color: '#b5651d', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}
          >
            Paste
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Start (seconds)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={segmentStart}
            onChange={e => onSegmentStartChange(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            End (seconds)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={segmentEnd}
            onChange={e => onSegmentEndChange(e.target.value)}
            placeholder="60"
            style={inputStyle}
          />
        </div>
      </div>

      <p className="text-xs" style={{ color: '#7a7060' }}>
        Leave blank to process the first 60 seconds. Specify a range (e.g. 0–30) to extract a specific clip.
      </p>
    </div>
  );
}
