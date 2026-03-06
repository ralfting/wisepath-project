import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has('access_token');

  // Redirect unauthenticated users trying to access /dashboard to /login
  if (pathname.startsWith('/dashboard') && !hasAccessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users trying to access /login or /signup to /dashboard
  if ((pathname === '/login' || pathname === '/signup') && hasAccessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
