import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { segments: { id: string; segment_number: number }[] };

  const updates = body.segments.map(({ id: segId, segment_number }) =>
    supabase
      .from('transcriptions')
      .update({ segment_number })
      .eq('id', segId)
      .eq('user_id', user.id)
  );

  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
