import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Vérifie que la requête provient d'un utilisateur connecté ayant le rôle 'admin'.
 * À appeler en tête de chaque route sous app/api/admin/ avant toute opération
 * sensible (POST/PUT/DELETE utilisant la clé de service Supabase).
 *
 * Retourne `null` si l'accès est autorisé, ou une NextResponse d'erreur
 * (401/403) à renvoyer immédiatement sinon.
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
  }

  // Client "lecture seule" lié aux cookies de la requête entrante.
  // setAll est un no-op : on ne réécrit pas de réponse ici, seule la lecture
  // de session nous intéresse dans une Route Handler.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Pas de réponse à enrichir dans ce contexte : on ignore les écritures.
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  return null;
}
