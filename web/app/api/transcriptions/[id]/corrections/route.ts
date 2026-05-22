import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CorrectionInput {
  instrument: string;
  note_index: number;
  original_sargam: string | null;
  corrected_sargam: string | null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: t } = await supabase.from('transcriptions').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as { corrections: CorrectionInput[] };
  const { corrections } = body;

  if (!Array.isArray(corrections) || corrections.length === 0) {
    return NextResponse.json({ error: 'No corrections provided' }, { status: 400 });
  }

  const rows = corrections.map(c => ({
    transcription_id: id,
    instrument: c.instrument,
    note_index: c.note_index,
    original_sargam: c.original_sargam,
    corrected_sargam: c.corrected_sargam,
    corrected_by: user.id,
  }));

  const { error } = await supabase.from('manual_corrections').upsert(rows, {
    onConflict: 'transcription_id,instrument,note_index',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark as verified
  await supabase.from('transcriptions').update({ verified: true }).eq('id', id);

  return NextResponse.json({ success: true, count: rows.length });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('manual_corrections').delete().eq('transcription_id', id);
  await supabase.from('transcriptions').update({ verified: false }).eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
