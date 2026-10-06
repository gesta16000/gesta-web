import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1. Récupérer l'utilisateur et son profil
  const { data: { user } } = await supabase.auth.getUser();
  
  // Si pas connecté, on redirige vers le login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'lecture';

  // 2. Bloquer l'accès à /admin si le rôle n'est pas 'admin'
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

// Configurer les routes que le middleware doit surveiller
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};