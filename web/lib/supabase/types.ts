// Placeholder — replace with output from: supabase gen types typescript --project-id YOUR_ID
// This file reflects the V2 schema with manual_corrections table and updated columns.

export interface Database {
  public: {
    Tables: {
      tone_groups: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          song_title: string | null;
          song_artist: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tone_groups']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tone_groups']['Insert']>;
      };
      transcriptions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: 'youtube' | 'upload';
          source_url: string | null;
          original_key: string;
          duration: number | null;
          note_count: number | null;
          audio_file_path: string | null;
          stems_paths: Record<string, string> | null;
          result_json: Record<string, unknown>;
          drum_pattern_json: Record<string, unknown> | null;
          verified: boolean;
          segment_number: number;
          tone_group_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transcriptions']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transcriptions']['Insert']>;
      };
      manual_corrections: {
        Row: {
          id: string;
          transcription_id: string;
          instrument: string;
          note_index: number;
          original_sargam: string | null;
          corrected_sargam: string | null;
          corrected_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['manual_corrections']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['manual_corrections']['Insert']>;
      };
    };
  };
}
