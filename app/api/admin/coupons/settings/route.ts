export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

const KEY = 'coupons_enabled';

export async function GET() {
  const { error } = await adminGuard('cupons');
  if (error) return error;
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    // Padrão: habilitado (comportamento atual)
    const enabled = (row?.value ?? 'true') === 'true';
    return NextResponse.json({ coupons_enabled: enabled });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error, session } = await adminGuard('cupons');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const value = b.coupons_enabled ? 'true' : 'false';
    await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
    await logActivity({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name,
      action: 'update',
      entity: 'coupons',
      details: `${value === 'true' ? 'Ativou' : 'Desativou'} a exibição de cupons no app`,
    });
    return NextResponse.json({ ok: true, coupons_enabled: value === 'true' });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}
