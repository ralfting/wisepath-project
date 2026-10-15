import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Where a logged-in user lands */
const HOME = '/projects';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has('access_token');
  const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));

  // The landing page is for visitors; logged-in users go straight to their projects
  if (pathname === '/' && hasAccessToken) return redirect(HOME);

  // The old dashboard is replaced by the projects list
  if (pathname.startsWith('/dashboard')) return redirect(hasAccessToken ? HOME : '/login');

  // Projects and the Inbox need an account
  if ((pathname.startsWith('/projects') || pathname === '/inbox') && !hasAccessToken) return redirect('/login');

  // Logged-in users have no use for the login and signup pages
  if ((pathname === '/login' || pathname === '/signup') && hasAccessToken) return redirect(HOME);

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: ['/', '/dashboard/:path*', '/projects/:path*', '/inbox', '/login', '/signup'],
};
