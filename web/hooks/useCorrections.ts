'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface CorrectionInput {
  instrument: string;
  note_index: number;
  original_sargam: string | null;
  corrected_sargam: string | null;
}

export function useSaveCorrections(transcriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (corrections: CorrectionInput[]) => {
      const res = await fetch(`/api/transcriptions/${transcriptionId}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections }),
      });
      if (!res.ok) throw new Error('Failed to save corrections');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transcription(transcriptionId) });
    },
  });
}

export function useResetCorrections(transcriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transcriptions/${transcriptionId}/corrections`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to reset corrections');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transcription(transcriptionId) });
    },
  });
}
