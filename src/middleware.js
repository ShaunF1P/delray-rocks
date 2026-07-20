import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and static assets
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/coastal' ||
    pathname === '/api/coastal/signup' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/activity') || // Allow activity logging without extra auth check (it checks internally)
    pathname.startsWith('/api/playbook/seed') || // One-time seed endpoint
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for server-side auth check
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /coach/* routes — redirect to login if not authenticated
  if (pathname.startsWith('/coach') && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /parent/* routes
  if (pathname.startsWith('/parent') && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect API routes (except public ones already skipped above)
  if (pathname.startsWith('/api/') && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
