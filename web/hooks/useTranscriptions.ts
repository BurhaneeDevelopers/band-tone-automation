'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Transcription } from '@/types/transcription';

export function useTranscriptions() {
  return useQuery({
    queryKey: queryKeys.transcriptions,
    queryFn: async (): Promise<Transcription[]> => {
      const res = await fetch('/api/transcriptions');
      if (!res.ok) throw new Error('Failed to fetch transcriptions');
      return res.json();
    },
  });
}

export function useDeleteTranscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transcriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transcriptions });
      queryClient.invalidateQueries({ queryKey: queryKeys.toneGroups });
    },
  });
}
