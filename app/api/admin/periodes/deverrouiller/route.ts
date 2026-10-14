import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { requireAdmin } from '@/lib/supabase-server-auth';
import { getErrorMessage } from '@/lib/error';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { annee, mois, raison } = await request.json();
    if (!annee || typeof annee !== 'number') {
      return NextResponse.json({ success: false, error: 'Le champ annee est requis (number)' }, { status: 400 });
    }
    if (!raison || typeof raison !== 'string' || raison.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'La raison du déverrouillage est obligatoire' }, { status: 400 });
    }

    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabaseSession.auth.getUser();

    const { data, error } = await supabaseAdmin
      .from('periodes_cloture')
      .update({
        statut: 'ouvert',
        deverrouille_par: user?.id ?? null,
        deverrouille_a: new Date().toISOString(),
        raison_deverrouillage: raison.trim(),
      })
      .eq('annee', annee)
      .eq('mois', mois ?? null)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: 'DB: ' + error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}