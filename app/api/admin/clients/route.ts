export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error } = await adminGuard();
  if (error) return error;
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') ?? '';
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = 20;

    const where: any = { role: 'CUSTOMER' };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, cpf: true, phone: true, createdAt: true,
          addresses: { take: 1, where: { isDefault: true }, select: { neighborhood: true } },
          _count: { select: { carts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ clients, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
