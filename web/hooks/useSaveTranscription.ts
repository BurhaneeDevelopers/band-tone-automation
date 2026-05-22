'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { TranscriptionResult } from '@/types/transcription';

export interface SaveTranscriptionInput {
  title: string;
  result: TranscriptionResult;
  audioFile: File;
  sourceType: 'youtube' | 'upload';
  sourceUrl?: string;
  songTitle?: string;
  songArtist?: string;
  toneGroupId?: string;
  newGroupName?: string;
  segmentNumber?: number;
}

export function useSaveTranscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTranscriptionInput) => {
      const formData = new FormData();
      formData.append('title', input.title);
      formData.append('result', JSON.stringify(input.result));
      formData.append('audio_file', input.audioFile);
      formData.append('source_type', input.sourceType);
      if (input.sourceUrl) formData.append('source_url', input.sourceUrl);
      if (input.songTitle) formData.append('song_title', input.songTitle);
      if (input.songArtist) formData.append('song_artist', input.songArtist);
      if (input.toneGroupId) formData.append('tone_group_id', input.toneGroupId);
      if (input.newGroupName) formData.append('new_group_name', input.newGroupName);
      if (input.segmentNumber) formData.append('segment_number', String(input.segmentNumber));

      const res = await fetch('/api/save-transcription', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to save');
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transcriptions });
      queryClient.invalidateQueries({ queryKey: queryKeys.toneGroups });
    },
  });
}
