import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: group, error: groupError } = await supabase
    .from('tone_groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (groupError) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: transcriptions } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('tone_group_id', id)
    .eq('user_id', user.id)
    .order('segment_number', { ascending: true });

  return NextResponse.json({ ...group, transcriptions: transcriptions ?? [] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('transcriptions').delete().eq('tone_group_id', id).eq('user_id', user.id);
  const { error } = await supabase.from('tone_groups').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
