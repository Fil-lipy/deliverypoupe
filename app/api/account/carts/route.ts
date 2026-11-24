export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;

    const carts = await prisma.cart.findMany({
      where: { userId, status: { in: ['SENT_WHATSAPP', 'CONVERTED'] } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = carts.map((c: any) => ({
      ...c,
      subtotal: Number(c.subtotal),
      discount: Number(c.discount),
      deliveryFee: Number(c.deliveryFee),
      total: Number(c.total),
      items: c.items.map((i: any) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
