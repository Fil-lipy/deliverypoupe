export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('relacionados');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const data: any = {};
    if (b.name !== undefined) data.name = String(b.name).trim();
    if (b.type !== undefined) data.type = b.type === 'UP_SELL' ? 'UP_SELL' : 'CROSS_SELL';
    if (b.active !== undefined) data.active = b.active !== false;
    if (b.order !== undefined) data.order = Number(b.order) || 0;
    if (b.targetLimit !== undefined) data.targetLimit = Number(b.targetLimit) > 0 ? Math.min(Math.floor(Number(b.targetLimit)), 20) : 4;
    const rule = await prisma.relationRule.update({ where: { id: params.id }, data });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'update', entity: 'relation-rule', entityId: rule.id, details: rule.name });
    return NextResponse.json({ rule });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar regra.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('relacionados');
  if (error) return error;
  try {
    await prisma.relationRule.delete({ where: { id: params.id } });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'delete', entity: 'relation-rule', entityId: params.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir regra.' }, { status: 500 });
  }
}
