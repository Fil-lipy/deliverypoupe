export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recalculateCart } from '@/lib/cart-utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { quantity } = await req.json();
    const item = await prisma.cartItem.findUnique({ where: { id: params.id }, include: { cart: true } });
    if (!item || item.cart.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: params.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: params.id },
        data: { quantity, subtotal: quantity * Number(item.unitPrice) },
      });
    }

    await recalculateCart(item.cartId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar item.' }, { status: 500 });
  }
}
