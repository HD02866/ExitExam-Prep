import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isProtectedRoute =
    path.startsWith('/admin') ||
    path.startsWith('/instructor') ||
    path.startsWith('/student');

  // If unauthenticated and accessing a protected route -> redirect to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // If authenticated, fetch profile to enforce role and account status
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('id', user.id)
      .single();

    // Check account status
    if (profile && profile.account_status !== 'active') {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set(
        'error',
        `Your account is ${profile.account_status}. Please contact an administrator.`
      );
      return NextResponse.redirect(url);
    }

    // If on auth pages (login/register) and already authenticated -> redirect to proper dashboard
    if (path.startsWith('/login') || path.startsWith('/register')) {
      const role = profile?.role || 'student';
      const url = request.nextUrl.clone();
      url.pathname = `/${role}`;
      return NextResponse.redirect(url);
    }

    // Role-based route guard
    if (profile) {
      if (path.startsWith('/admin') && profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = `/${profile.role}`;
        return NextResponse.redirect(url);
      }

      if (path.startsWith('/instructor') && profile.role !== 'instructor' && profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = `/${profile.role}`;
        return NextResponse.redirect(url);
      }

      if (path.startsWith('/student') && profile.role !== 'student' && profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = `/${profile.role}`;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
