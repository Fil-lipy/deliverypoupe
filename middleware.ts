import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'on',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl?.pathname ?? '';

    // Admin routes require ADMIN role
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', req.url)));
    }

    return withSecurityHeaders(NextResponse.next());
  },
  {
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl?.pathname ?? '';
        // Public routes (auth pages + guest-browsable catalog)
        const publicPrefixes = ['/login', '/cadastro', '/api/auth', '/api/signup', '/home', '/busca', '/categoria', '/categorias', '/produto', '/ofertas'];
        if (publicPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/home/:path*',
    '/busca/:path*',
    '/categoria/:path*',
    '/categorias/:path*',
    '/produto/:path*',
    '/ofertas/:path*',
    '/carrinho/:path*',
    '/checkout/:path*',
    '/conta/:path*',
    '/admin/:path*',
    '/login',
    '/cadastro',
  ],
};
