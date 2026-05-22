'use client';

import { useState } from 'react';
import { ALL_KEYS } from '@/types/transcription';
import { ToneGroupWithSegments } from '@/types/transcription';

interface UploadSettingsProps {
  segmentLabel: string;
  onSegmentLabelChange: (v: string) => void;
  selectedKey: string;
  onKeyChange: (v: string) => void;
  toneGroupId: string;
  onToneGroupChange: (id: string, name?: string) => void;
  toneGroups: ToneGroupWithSegments[];
  visibleInstruments: Record<string, boolean>;
  onInstrumentToggle: (key: string) => void;
}

export function UploadSettings({
  segmentLabel,
  onSegmentLabelChange,
  selectedKey,
  onKeyChange,
  toneGroupId,
  onToneGroupChange,
  toneGroups,
  visibleInstruments,
  onInstrumentToggle,
}: UploadSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const instruments = [
    { key: 'trumpet', label: 'Trumpet' },
    { key: 'alto_saxophone', label: 'Alto Saxophone' },
    { key: 'trombone', label: 'Trombone' },
    { key: 'euphonium', label: 'Euphonium' },
  ];

  const inputStyle: React.CSSProperties = {
    background: '#1e1c15',
    border: '1px solid #2a2520',
    color: '#f0ebe0',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    fontFamily: "'Barlow', sans-serif",
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2520' }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
        style={{
          background: '#111109',
          color: '#c8bfa8',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
        onClick={() => setIsOpen(o => !o)}
      >
        <span>Settings</span>
        <span style={{ color: '#b5651d' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4"
          style={{ background: '#0e0e0b', borderTop: '1px solid #2a2520' }}
        >
          {/* Segment label */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Segment Label
            </label>
            <input
              value={segmentLabel}
              onChange={e => onSegmentLabelChange(e.target.value)}
              placeholder="e.g. Intro bar 1-4"
              style={inputStyle}
            />
          </div>

          {/* Key override */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Key Override
            </label>
            <select value={selectedKey} onChange={e => onKeyChange(e.target.value)} style={inputStyle}>
              <option value="auto">Auto-detect</option>
              {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Tone Group */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Tone Group
            </label>
            <select
              value={showNewGroup ? 'new' : toneGroupId}
              onChange={e => {
                if (e.target.value === 'new') {
                  setShowNewGroup(true);
                } else {
                  setShowNewGroup(false);
                  onToneGroupChange(e.target.value);
                }
              }}
              style={inputStyle}
            >
              <option value="">No group</option>
              {toneGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="new">+ Create new group</option>
            </select>
            {showNewGroup && (
              <input
                value={newGroupName}
                onChange={e => {
                  setNewGroupName(e.target.value);
                  onToneGroupChange('new', e.target.value);
                }}
                placeholder="New group name"
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            )}
          </div>

          {/* Instrument filter */}
          <div>
            <label className="block text-xs mb-1" style={{ color: '#7a7060', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Show Instruments
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {instruments.map(inst => (
                <label key={inst.key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleInstruments[inst.key] ?? true}
                    onChange={() => onInstrumentToggle(inst.key)}
                    className="accent-[#b5651d]"
                  />
                  <span className="text-xs" style={{ color: '#c8bfa8' }}>{inst.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
