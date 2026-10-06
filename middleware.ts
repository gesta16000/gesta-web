import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Vérifier si l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Pas connecté ? Redirection vers le login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Vérifier le rôle de l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'lecture';

  // 3. Bloquer l'accès à /admin si le rôle n'est pas 'admin'
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

// On applique ce middleware uniquement aux routes /admin
export const config = {
  matcher: ['/admin/:path*'],
};