export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('bairros');
  if (error) return error;
  try {
    const id = params.id;
    const existing = await prisma.neighborhood.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Bairro não encontrado.' }, { status: 404 });
    const b = (await req.json()) ?? {};
    const data: any = {};
    if (b.name !== undefined) {
      const nome = String(b.name).trim();
      if (!nome) return NextResponse.json({ error: 'Informe o nome do bairro.' }, { status: 400 });
      if (nome.toLowerCase() !== existing.nome.toLowerCase()) {
        const dup = await prisma.neighborhood.findUnique({ where: { nome } });
        if (dup) return NextResponse.json({ error: 'Já existe um bairro com este nome.' }, { status: 400 });
      }
      data.nome = nome;
    }
    if (b.variacoes !== undefined) data.variacoes = Array.isArray(b.variacoes) ? b.variacoes.map((v: any) => String(v).trim()).filter(Boolean) : [];
    if (b.deliveryFee !== undefined) data.taxa = Number(b.deliveryFee ?? 0) || 0;
    if (b.minimumOrder !== undefined) data.minimo = Number(b.minimumOrder ?? 0) || 0;
    if (b.freeDeliveryFrom !== undefined) data.freteGratis = b.freeDeliveryFrom == null || b.freeDeliveryFrom === '' ? null : Number(b.freeDeliveryFrom);
    if (b.prazo !== undefined) data.prazo = b.prazo ? String(b.prazo).trim() : null;
    if (b.atendido !== undefined) data.atendido = Boolean(b.atendido);
    if (b.active !== undefined) data.ativo = Boolean(b.active);
    const updated = await prisma.neighborhood.update({ where: { id }, data });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'update', entity: 'neighborhood', entityId: id, details: `Atualizou o bairro “${updated.nome}”` });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar bairro.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('bairros');
  if (error) return error;
  try {
    const id = params.id;
    const existing = await prisma.neighborhood.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Bairro não encontrado.' }, { status: 404 });
    await prisma.neighborhood.delete({ where: { id } });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'delete', entity: 'neighborhood', entityId: id, details: `Removeu o bairro “${existing.nome}”` });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover bairro.' }, { status: 500 });
  }
}
