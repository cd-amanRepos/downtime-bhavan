import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminCookie, ADMIN_TOKEN, COOKIE_NAME } from '@/lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export async function middleware(req: NextRequest) {
  // /admin/login + /api/admin/login are public
  if (req.nextUrl.pathname === '/admin/login' || req.nextUrl.pathname === '/api/admin/login') {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  if (await verifyAdminCookie(cookie, ADMIN_TOKEN())) return NextResponse.next();

  // Redirect unauthenticated admin page requests to login
  if (req.nextUrl.pathname.startsWith('/admin/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  // Block unauthenticated /api/admin/* with 401
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
