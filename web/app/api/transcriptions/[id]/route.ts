import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: transcription, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !transcription) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch manual corrections and merge
  const { data: corrections } = await supabase
    .from('manual_corrections')
    .select('*')
    .eq('transcription_id', id);

  // Merge corrections into result_json
  if (corrections && corrections.length > 0) {
    const result = { ...(transcription.result_json as Record<string, unknown>) };
    const instruments = result.instruments as Record<string, { notes?: unknown[] }> | undefined;
    if (instruments) {
      for (const corr of corrections) {
        const inst = instruments[corr.instrument as string];
        if (inst?.notes && Array.isArray(inst.notes)) {
          const idx = corr.note_index as number;
          if (idx >= 0 && idx < inst.notes.length) {
            (inst.notes[idx] as Record<string, unknown>)['sargam'] = corr.corrected_sargam;
          }
        }
      }
    }
    transcription.result_json = result as typeof transcription.result_json;
  }

  return NextResponse.json(transcription);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: t } = await supabase.from('transcriptions').select('audio_file_path, stems_paths').eq('id', id).eq('user_id', user.id).single();
  if (t?.audio_file_path) {
    await supabase.storage.from('audio-uploads').remove([t.audio_file_path]);
  }
  if (t?.stems_paths && typeof t.stems_paths === 'object') {
    const paths = Object.values(t.stems_paths as Record<string, string>);
    if (paths.length) await supabase.storage.from('audio-stems').remove(paths);
  }

  await supabase.from('manual_corrections').delete().eq('transcription_id', id);
  const { error } = await supabase.from('transcriptions').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
