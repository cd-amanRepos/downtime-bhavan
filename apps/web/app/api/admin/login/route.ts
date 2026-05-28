import { NextResponse } from 'next/server';
import { signAdminCookie, ADMIN_TOKEN, COOKIE_NAME } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let token: string;
  try { ({ token } = await req.json() as { token: string }); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  if (token !== ADMIN_TOKEN()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cookie = await signAdminCookie(ADMIN_TOKEN());  // AWAIT — async after Task 1 fix
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
