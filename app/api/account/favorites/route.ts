export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProductsByIds, mapProductToAPI } from '@/lib/supabase-db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const favs = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const ids = favs.map((f) => f.productId);
    const numericIds = ids.map((i) => parseInt(i, 10)).filter((n) => !isNaN(n));
    let products: any[] = [];
    if (numericIds.length > 0) {
      const rows = await getProductsByIds(numericIds);
      const mapped = rows.map(mapProductToAPI);
      // preserve favorite order (most recent first)
      products = ids.map((id) => mapped.find((m) => m.id === id)).filter(Boolean);
    }
    return NextResponse.json({ productIds: ids, products });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const { productId } = (await req.json()) ?? {};
    if (!productId) return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 });
    await prisma.favorite.upsert({
      where: { userId_productId: { userId, productId: String(productId) } },
      create: { userId, productId: String(productId) },
      update: {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao favoritar.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const productId = new URL(req.url).searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'Produto inválido.' }, { status: 400 });
    await prisma.favorite.deleteMany({ where: { userId, productId: String(productId) } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover.' }, { status: 500 });
  }
}
