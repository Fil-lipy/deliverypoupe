export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error } = await adminGuard();
  if (error) return error;
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? '';
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = 20;

    const where: any = {};
    if (status && status !== 'all') where.status = status;

    const [carts, total] = await Promise.all([
      prisma.cart.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cart.count({ where }),
    ]);

    const serialized = carts.map((c: any) => ({
      ...c,
      subtotal: Number(c.subtotal),
      discount: Number(c.discount),
      deliveryFee: Number(c.deliveryFee),
      total: Number(c.total),
      items: c.items.map((i: any) => ({ ...i, unitPrice: Number(i.unitPrice), subtotal: Number(i.subtotal) })),

    }));

    return NextResponse.json({ carts: serialized, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
