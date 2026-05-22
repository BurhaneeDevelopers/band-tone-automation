import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: groups, error } = await supabase
    .from('tone_groups')
    .select('*, transcriptions(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withCount = (groups ?? []).map((g: Record<string, unknown>) => ({
    ...g,
    segment_count: (g.transcriptions as Array<{count: number}>)?.[0]?.count ?? 0,
    transcriptions: undefined,
  }));

  return NextResponse.json(withCount);
}
