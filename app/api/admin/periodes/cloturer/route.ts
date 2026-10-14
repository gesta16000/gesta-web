import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { requireAdmin } from '@/lib/supabase-server-auth';
import { getErrorMessage } from '@/lib/error';
import type { PeriodeCloture } from '@/types/admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { annee, mois } = await request.json();
    if (!annee || typeof annee !== 'number') {
      return NextResponse.json({ success: false, error: 'Le champ annee est requis (number)' }, { status: 400 });
    }

    // CORRECTION : Définition correcte de supabaseSession pour lire les cookies
    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabaseSession.auth.getUser();

    const { data, error } = await supabaseAdmin
      .from('periodes_cloture')
      .upsert(
        {
          annee,
          mois: mois ?? null,
          statut: 'cloture',
          cloture_par: user?.id ?? null,
          cloture_a: new Date().toISOString(),
          deverrouille_par: null,
          deverrouille_a: null,
          raison_deverrouillage: null,
        },
        { onConflict: 'annee,mois' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: 'DB: ' + error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: data as PeriodeCloture });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}