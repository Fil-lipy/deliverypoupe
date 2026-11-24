export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

function serialize(n: any) {
  return {
    id: n.id,
    name: n.nome,
    variacoes: n.variacoes ?? [],
    deliveryFee: n.taxa != null ? Number(n.taxa) : 0,
    minimumOrder: n.minimo != null ? Number(n.minimo) : 0,
    freeDeliveryFrom: n.freteGratis != null ? Number(n.freteGratis) : null,
    prazo: n.prazo ?? null,
    atendido: n.atendido,
    active: n.ativo,
    order: n.order,
  };
}

export async function GET() {
  const { error } = await adminGuard('bairros');
  if (error) return error;
  try {
    const rows = await prisma.neighborhood.findMany({ orderBy: [{ order: 'asc' }, { nome: 'asc' }] });
    return NextResponse.json({ neighborhoods: rows.map(serialize) });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao carregar bairros.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard('bairros');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const nome = String(b.name ?? '').trim();
    if (!nome) return NextResponse.json({ error: 'Informe o nome do bairro.' }, { status: 400 });
    const exists = await prisma.neighborhood.findUnique({ where: { nome } });
    if (exists) return NextResponse.json({ error: 'Já existe um bairro com este nome.' }, { status: 400 });
    const count = await prisma.neighborhood.count();
    const created = await prisma.neighborhood.create({
      data: {
        nome,
        variacoes: Array.isArray(b.variacoes) ? b.variacoes.map((v: any) => String(v).trim()).filter(Boolean) : [],
        taxa: Number(b.deliveryFee ?? 0) || 0,
        minimo: Number(b.minimumOrder ?? 0) || 0,
        freteGratis: b.freeDeliveryFrom == null || b.freeDeliveryFrom === '' ? null : Number(b.freeDeliveryFrom),
        prazo: b.prazo ? String(b.prazo).trim() : null,
        atendido: b.atendido !== undefined ? Boolean(b.atendido) : true,
        ativo: b.active !== undefined ? Boolean(b.active) : true,
        order: count,
      },
    });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'create', entity: 'neighborhood', entityId: created.id, details: `Cadastrou o bairro “${nome}”` });
    return NextResponse.json({ ok: true, neighborhood: serialize(created) });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cadastrar bairro.' }, { status: 500 });
  }
}
