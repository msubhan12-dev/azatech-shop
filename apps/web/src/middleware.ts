import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('azatech_auth')?.value;
  const role = request.cookies.get('azatech_role')?.value;

  // Redirect to login if not authenticated
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin-only routes
  const isAdminOnly =
    pathname.startsWith('/dashboard/reports') ||
    pathname.startsWith('/dashboard/audit') ||
    pathname.startsWith('/dashboard/queue') ||
    pathname.startsWith('/dashboard/redis') ||
    // Product detail (stock adjustment) is admin-only; product list is for all
    pathname.match(/^\/dashboard\/products\/[^/]+$/) !== null;

  if (isAdminOnly && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
