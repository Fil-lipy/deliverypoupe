export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

const TRIGGER_TYPES = ['PRODUCT', 'CATEGORY', 'SUBCATEGORY', 'DETAIL', 'KEYWORD'];
const TARGET_TYPES = ['PRODUCT', 'CATEGORY', 'SUBCATEGORY', 'DETAIL', 'KEYWORD'];
const REL_TYPES = ['CROSS_SELL', 'UP_SELL'];

export async function GET() {
  const { error } = await adminGuard('relacionados');
  if (error) return error;
  try {
    const rules = await prisma.relationRule.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
    return NextResponse.json({ rules });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard('relacionados');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const triggerType = String(b.triggerType ?? '');
    const targetType = String(b.targetType ?? '');
    const triggerValue = String(b.triggerValue ?? '').trim();
    const targetValue = String(b.targetValue ?? '').trim();
    const type = REL_TYPES.includes(b.type) ? b.type : 'CROSS_SELL';
    if (!TRIGGER_TYPES.includes(triggerType)) return NextResponse.json({ error: 'Tipo de gatilho inválido.' }, { status: 400 });
    if (!TARGET_TYPES.includes(targetType)) return NextResponse.json({ error: 'Tipo de alvo inválido.' }, { status: 400 });
    if (!triggerValue || !targetValue) return NextResponse.json({ error: 'Preencha o gatilho e o alvo.' }, { status: 400 });

    const rule = await prisma.relationRule.create({
      data: {
        name: String(b.name ?? '').trim() || `${b.triggerLabel ?? triggerValue} → ${b.targetLabel ?? targetValue}`,
        type,
        triggerType,
        triggerValue,
        triggerLabel: String(b.triggerLabel ?? '').trim(),
        targetType,
        targetValue,
        targetLabel: String(b.targetLabel ?? '').trim(),
        targetLimit: Number.isFinite(b.targetLimit) && b.targetLimit > 0 ? Math.min(Math.floor(b.targetLimit), 20) : 4,
        order: Number.isFinite(b.order) ? b.order : 0,
        active: b.active !== false,
      },
    });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'create', entity: 'relation-rule', entityId: rule.id, details: rule.name });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar regra.' }, { status: 500 });
  }
}
