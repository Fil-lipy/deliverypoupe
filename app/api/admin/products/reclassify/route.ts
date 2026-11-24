export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { invalidateOverrides } from '@/lib/supabase-db';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

// Reclassificação em massa: aplica uma nova categoria/subcategoria a um conjunto de EANs.
export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const body = await req.json();
    const eans: string[] = Array.isArray(body?.eans) ? body.eans.filter((e: any) => typeof e === 'string' && e.trim()) : [];
    const catSlug = String(body?.catSlug ?? '').trim();
    const catName = String(body?.catName ?? '').trim();
    const subSlug = body?.subSlug ? String(body.subSlug).trim() : null;
    const subName = body?.subName ? String(body.subName).trim() : null;

    if (!eans.length) return NextResponse.json({ error: 'Nenhum produto selecionado.' }, { status: 400 });
    if (!catSlug || !catName) return NextResponse.json({ error: 'Selecione a categoria de destino.' }, { status: 400 });
    if (eans.length > 20000) return NextResponse.json({ error: 'Seleção muito grande.' }, { status: 400 });

    // Upsert em lotes para respeitar limites de conexão/tempo do banco.
    const uniqueEans = Array.from(new Set(eans));
    const BATCH = 200;
    for (let i = 0; i < uniqueEans.length; i += BATCH) {
      const slice = uniqueEans.slice(i, i + BATCH);
      await prisma.$transaction(
        slice.map((ean) =>
          prisma.productOverride.upsert({
            where: { ean },
            update: { catSlug, catName, subSlug, subName },
            create: { ean, catSlug, catName, subSlug, subName },
          })
        )
      );
    }
    invalidateOverrides();
    await logActivity({
      userId: (session!.user as any).id,
      userName: session!.user?.name,
      action: 'reclassify',
      entity: 'product',
      entityId: `${uniqueEans.length} itens`,
      details: `→ ${catName}${subName ? ' / ' + subName : ''}`,
    });
    return NextResponse.json({ ok: true, count: uniqueEans.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao reclassificar produtos.' }, { status: 500 });
  }
}
