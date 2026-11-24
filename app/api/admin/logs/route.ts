export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error } = await adminGuard('logs');
  if (error) return error;
  try {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const pageSize = 50;
    const entity = sp.get('entity');
    const where = entity ? { entity } : {};
    const [logs, total, entities] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({ select: { entity: true }, distinct: ['entity'], where: { entity: { not: null } } }),
    ]);
    return NextResponse.json({
      logs, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)),
      entities: entities.map((e) => e.entity).filter(Boolean),
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
