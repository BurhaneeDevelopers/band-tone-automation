'use client';

import Link from 'next/link';
import { ToneGroupWithSegments } from '@/types/transcription';
import { formatDuration } from '@/lib/utils';
import { useDeleteToneGroup } from '@/hooks/useToneGroups';
import { toast } from 'sonner';

interface ToneGroupCardProps {
  group: ToneGroupWithSegments;
}

export function ToneGroupCard({ group }: ToneGroupCardProps) {
  const deleteMutation = useDeleteToneGroup();

  const totalDuration = group.transcriptions?.reduce((sum, t) => sum + (t.duration ?? 0), 0) ?? 0;
  const totalNotes = group.transcriptions?.reduce((sum, t) => sum + (t.note_count ?? 0), 0) ?? 0;

  const handleDelete = async () => {
    if (!confirm(`Delete tone group "${group.name}" and all its segments?`)) return;
    try {
      await deleteMutation.mutateAsync(group.id);
      toast.success('Tone group deleted');
    } catch {
      toast.error('Failed to delete tone group');
    }
  };

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3 group hover:border-[#b5651d]/40 transition-colors"
      style={{ background: '#111109', border: '1px solid #2a2520' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3
            className="font-bold text-base leading-none mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}
          >
            {group.name}
          </h3>
          {(group.song_title || group.song_artist) && (
            <p className="text-xs truncate" style={{ color: '#b5651d' }}>
              {[group.song_artist, group.song_title].filter(Boolean).join(' — ')}
            </p>
          )}
          {group.description && (
            <p className="text-xs" style={{ color: '#7a7060' }}>{group.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded"
          style={{ color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)' }}
        >
          Delete
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs" style={{ color: '#7a7060' }}>
        <span>{group.segment_count ?? 0} segments</span>
        <span>{totalDuration > 0 ? formatDuration(totalDuration) : '—'}</span>
        <span>{totalNotes > 0 ? `${totalNotes} notes` : '—'}</span>
      </div>

      <Link
        href={`/tones/${group.id}`}
        className="text-xs font-semibold transition-colors"
        style={{
          color: '#b5651d',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        View Tone →
      </Link>
    </div>
  );
}
