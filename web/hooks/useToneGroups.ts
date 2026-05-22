'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ToneGroup, ToneGroupWithSegments } from '@/types/transcription';

export function useToneGroups() {
  return useQuery({
    queryKey: queryKeys.toneGroups,
    queryFn: async (): Promise<ToneGroupWithSegments[]> => {
      const res = await fetch('/api/tone-groups');
      if (!res.ok) throw new Error('Failed to fetch tone groups');
      return res.json();
    },
  });
}

export function useToneGroup(id: string) {
  return useQuery({
    queryKey: queryKeys.toneGroup(id),
    queryFn: async (): Promise<ToneGroupWithSegments> => {
      const res = await fetch(`/api/tone-groups/${id}`);
      if (!res.ok) throw new Error('Failed to fetch tone group');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useDeleteToneGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tone-groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tone group');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.toneGroups });
    },
  });
}
