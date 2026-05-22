'use client';

import { Transcription } from '@/types/transcription';
import { formatDuration } from '@/lib/utils';
import { useDeleteTranscription } from '@/hooks/useTranscriptions';
import { toast } from 'sonner';

interface SegmentCardProps {
  segment: Transcription;
  onDeleted?: () => void;
}

export function SegmentCard({ segment, onDeleted }: SegmentCardProps) {
  const deleteMutation = useDeleteTranscription();

  const handleDelete = async () => {
    if (!confirm(`Delete segment "${segment.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(segment.id);
      toast.success('Segment deleted');
      onDeleted?.();
    } catch {
      toast.error('Failed to delete segment');
    }
  };

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between group"
      style={{ background: '#111109', border: '1px solid #2a2520' }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
          style={{ background: '#1a1a14', color: '#b5651d', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {segment.segment_number}
        </div>
        <div>
          <p
            className="font-semibold text-sm"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f0ebe0' }}
          >
            {segment.title}
          </p>
          <p className="text-xs" style={{ color: '#7a7060' }}>
            {formatDuration(segment.duration)} · {segment.note_count} notes · Key: {segment.original_key} → C{segment.verified ? ' · ✓ Verified' : ''}
          </p>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded"
        style={{ color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)' }}
      >
        Delete
      </button>
    </div>
  );
}
