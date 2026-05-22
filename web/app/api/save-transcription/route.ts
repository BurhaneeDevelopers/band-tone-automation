import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const title = formData.get('title') as string;
  const resultStr = formData.get('result') as string;
  const audioFile = formData.get('audio_file') as File | null;
  const toneGroupId = formData.get('tone_group_id') as string | null;
  const newGroupName = formData.get('new_group_name') as string | null;
  const segmentNumber = parseInt(formData.get('segment_number') as string ?? '1');
  const sourceType = (formData.get('source_type') as string) || 'upload';
  const sourceUrl = formData.get('source_url') as string | null;
  const songTitle = formData.get('song_title') as string | null;
  const songArtist = formData.get('song_artist') as string | null;

  if (!title || !resultStr) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  let result: Record<string, unknown>;
  try { result = JSON.parse(resultStr); } catch {
    return NextResponse.json({ error: 'Invalid result JSON' }, { status: 400 });
  }

  let resolvedGroupId: string | null = toneGroupId || null;

  if (newGroupName) {
    const { data: newGroup, error } = await supabase
      .from('tone_groups')
      .insert({ user_id: user.id, name: newGroupName, song_title: songTitle, song_artist: songArtist })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    resolvedGroupId = newGroup.id;
  }

  let audioFilePath: string | null = null;
  if (audioFile && resolvedGroupId) {
    const ext = audioFile.name.split('.').pop() ?? 'mp3';
    const path = `${user.id}/${resolvedGroupId}/${segmentNumber}/original.${ext}`;
    const arrayBuffer = await audioFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('audio-uploads')
      .upload(path, arrayBuffer, { contentType: audioFile.type, upsert: true });
    if (!uploadError) audioFilePath = path;
  }

  const { data: transcription, error: insertError } = await supabase
    .from('transcriptions')
    .insert({
      user_id: user.id,
      title,
      source_type: sourceType,
      source_url: sourceUrl,
      original_key: (result.original_key as string) ?? 'C',
      duration: (result.duration as number) ?? 0,
      note_count: (result.note_count as number) ?? 0,
      audio_file_path: audioFilePath,
      result_json: result,
      verified: false,
      segment_number: segmentNumber,
      tone_group_id: resolvedGroupId,
    })
    .select().single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(transcription);
}
