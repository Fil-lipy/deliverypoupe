export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await adminGuard();
  if (error) return error;
  try {
    const { status } = await req.json();
    const cart = await prisma.cart.update({ where: { id: params.id }, data: { status } });
    return NextResponse.json({ ...cart, total: Number(cart.total) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
