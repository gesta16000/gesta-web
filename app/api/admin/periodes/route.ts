import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/supabase-server-auth';
import { getErrorMessage } from '@/lib/error';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await supabaseAdmin
      .from('periodes_cloture')
      .select('*')
      .order('annee', { ascending: false })
      .order('mois', { ascending: false, nullsFirst: true });

    if (error) return NextResponse.json({ success: false, error: 'DB: ' + error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}