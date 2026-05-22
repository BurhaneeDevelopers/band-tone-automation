export const queryKeys = {
  transcriptions: ['transcriptions'] as const,
  transcription: (id: string) => ['transcriptions', id] as const,
  toneGroups: ['tone-groups'] as const,
  toneGroup: (id: string) => ['tone-groups', id] as const,
};
