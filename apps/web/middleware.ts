import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { HOME, afterLogin, loginHref } from '@/shared/routes';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAccessToken = request.cookies.has('access_token');
  const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));

  // Paths lived under /projects before projects came to group them; old links keep working
  if (pathname === '/projects' || pathname.startsWith('/projects/')) {
    const moved = request.nextUrl.clone();
    moved.pathname = pathname.replace(/^\/projects/, '/paths');
    return NextResponse.redirect(moved, 308);
  }

  // The landing page is for visitors; logged-in users go straight to their paths
  if (pathname === '/' && hasAccessToken) return redirect(HOME);

  // The old dashboard is replaced by the paths list
  if (pathname.startsWith('/dashboard')) return redirect(hasAccessToken ? HOME : '/login');

  // Paths and the Inbox need an account
  if ((pathname.startsWith('/paths') || pathname === '/inbox') && !hasAccessToken) return redirect(loginHref(pathname + search));

  // Capturing from the web (a popup), settings and the review of publications come back, filled in, once logged in
  if ((pathname === '/capture' || pathname.startsWith('/settings') || pathname.startsWith('/admin')) && !hasAccessToken) return redirect(loginHref(pathname + search));

  // Logged-in users have no use for the login and signup pages
  if ((pathname === '/login' || pathname === '/signup') && hasAccessToken) return redirect(afterLogin(request.nextUrl.searchParams.get('next')));

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: ['/', '/projects', '/projects/:path*', '/dashboard/:path*', '/paths/:path*', '/inbox', '/capture', '/settings/:path*', '/admin/:path*', '/login', '/signup'],
};
