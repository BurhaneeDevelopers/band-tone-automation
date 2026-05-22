'use client';

import { useState } from 'react';
import { ToneGroupWithSegments } from '@/types/transcription';

interface TranscribeSettingsProps {
  segmentLabel: string;
  onSegmentLabelChange: (v: string) => void;
  melodySource: string;
  onMelodySourceChange: (v: string) => void;
  includeBassForLow: boolean;
  onIncludeBassForLowChange: (v: boolean) => void;
  toneGroupId: string;
  onToneGroupChange: (id: string, name?: string) => void;
  toneGroups: ToneGroupWithSegments[];
  songTitle: string;
  onSongTitleChange: (v: string) => void;
  songArtist: string;
  onSongArtistChange: (v: string) => void;
}

export function TranscribeSettings(props: TranscribeSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const inputStyle: React.CSSProperties = {
    background: '#1e1c15', border: '1px solid #2a2520', borderRadius: '6px',
    color: '#f0ebe0', fontSize: '13px', fontFamily: "'Barlow', sans-serif",
    padding: '6px 10px', outline: 'none', width: '100%',
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2520' }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
        style={{ background: '#111109', color: '#c8bfa8', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}
        onClick={() => setIsOpen(o => !o)}
      >
        <span>Settings</span>
        <span style={{ color: '#b5651d' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4" style={{ background: '#0e0e0b', borderTop: '1px solid #2a2520' }}>
          {/* Segment label */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Segment Label
            </label>
            <input value={props.segmentLabel} onChange={e => props.onSegmentLabelChange(e.target.value)} placeholder="e.g. Intro bar 1–4" style={inputStyle} />
          </div>

          {/* Melody source */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Melody Source
            </label>
            <select value={props.melodySource} onChange={e => props.onMelodySourceChange(e.target.value)} style={inputStyle}>
              <option value="auto">Auto (other + vocals merged)</option>
              <option value="vocals_only">Vocals only</option>
              <option value="instruments_only">Instruments only (other stem)</option>
            </select>
          </div>

          {/* Song title */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Song Title
            </label>
            <input value={props.songTitle} onChange={e => props.onSongTitleChange(e.target.value)} placeholder="e.g. God's Plan" style={inputStyle} />
          </div>

          {/* Artist */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Artist
            </label>
            <input value={props.songArtist} onChange={e => props.onSongArtistChange(e.target.value)} placeholder="e.g. Drake" style={inputStyle} />
          </div>

          {/* Tone group */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Tone Group
            </label>
            <select
              value={showNewGroup ? 'new' : props.toneGroupId}
              onChange={e => {
                if (e.target.value === 'new') { setShowNewGroup(true); }
                else { setShowNewGroup(false); props.onToneGroupChange(e.target.value); }
              }}
              style={inputStyle}
            >
              <option value="">No group</option>
              {props.toneGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="new">+ Create new group</option>
            </select>
            {showNewGroup && (
              <input
                value={newGroupName}
                onChange={e => { setNewGroupName(e.target.value); props.onToneGroupChange('new', e.target.value); }}
                placeholder="New group name"
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            )}
          </div>

          {/* Bass for low instruments */}
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="includeBass"
              checked={props.includeBassForLow}
              onChange={e => props.onIncludeBassForLowChange(e.target.checked)}
              className="accent-[#b5651d]"
            />
            <label htmlFor="includeBass" className="text-xs cursor-pointer" style={{ color: '#c8bfa8' }}>
              Include bass line for Trombone & Euphonium
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
