export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

const KEY = 'delivery_fee_enabled';

export async function GET() {
  const { error } = await adminGuard('bairros');
  if (error) return error;
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    // Padrão: desabilitado — o frete é informado pelo atendente no WhatsApp.
    const enabled = (row?.value ?? 'false') === 'true';
    return NextResponse.json({ delivery_fee_enabled: enabled });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error, session } = await adminGuard('bairros');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const value = b.delivery_fee_enabled ? 'true' : 'false';
    await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
    await logActivity({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name,
      action: 'update',
      entity: 'delivery',
      details: `${value === 'true' ? 'Ativou' : 'Desativou'} o cálculo do frete na cesta`,
    });
    return NextResponse.json({ ok: true, delivery_fee_enabled: value === 'true' });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}
