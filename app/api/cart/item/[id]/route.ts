export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recalculateCart } from '@/lib/cart-utils';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const item = await prisma.cartItem.findUnique({ where: { id: params.id }, include: { cart: true } });
    if (!item || item.cart.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: params.id } });
    await recalculateCart(item.cartId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover item.' }, { status: 500 });
  }
}
