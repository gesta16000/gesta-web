import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16 : la convention middleware.ts est dépréciée et renommée proxy.ts
// (export nommé `proxy`). Voir node_modules/next/dist/docs/01-app/03-api-reference/
// 03-file-conventions/proxy.md
export async function proxy(request: NextRequest) {
  // On crée la réponse de base
  let response = NextResponse.next({ request });

  // On initialise Supabase avec la gestion des cookies (API getAll/setAll,
  // seule API supportée par la version actuelle de @supabase/ssr ; l'ancienne
  // API get/set/remove est dépréciée et source de bugs de synchronisation de
  // session difficiles à diagnostiquer).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // On récupère l'utilisateur (requête vérifiée auprès de Supabase, plus sûr
  // qu'un simple décodage du cookie de session)
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Si on est sur /admin et que l'utilisateur n'est PAS connecté -> Login
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si on est sur /admin et que l'utilisateur n'est PAS admin -> Dashboard
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

// ⚠️ TRÈS IMPORTANT : On applique le proxy UNIQUEMENT sur /admin
// Cela évite qu'il ne tourne sur /login et crée une boucle infinie
export const config = {
  matcher: ['/admin/:path*'],
};
