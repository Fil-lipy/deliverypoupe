import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canAccess } from '@/lib/permissions';

// adminGuard() -> requires ADMIN role.
// adminGuard('banners') -> also requires the 'banners' permission (or full access).
export async function adminGuard(permission?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }), session: null };
  if ((session.user as any).role !== 'ADMIN') return { error: NextResponse.json({ error: 'Sem permissão.' }, { status: 403 }), session: null };
  if (permission) {
    const perms = (session.user as any).permissions as string[] | undefined;
    if (!canAccess(perms, permission)) {
      return { error: NextResponse.json({ error: 'Sem permissão para esta área.' }, { status: 403 }), session: null };
    }
  }
  return { error: null, session };
}
