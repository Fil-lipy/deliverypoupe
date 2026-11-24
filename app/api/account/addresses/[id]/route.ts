export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const address = await prisma.address.findUnique({ where: { id: params.id } });
    if (!address || address.userId !== userId) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

    const body = await req.json();
    if (body.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({
      where: { id: params.id },
      data: {
        label: body.label !== undefined ? (body.label || null) : address.label,
        street: body.street ?? address.street,
        number: body.number ?? address.number,
        complement: body.complement !== undefined ? (body.complement || null) : address.complement,
        neighborhood: body.neighborhood ?? address.neighborhood,
        reference: body.reference !== undefined ? (body.reference || null) : address.reference,
        zipCode: body.zipCode ?? address.zipCode,
        isDefault: body.isDefault ?? address.isDefault,
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const address = await prisma.address.findUnique({ where: { id: params.id } });
    if (!address || address.userId !== userId) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
    await prisma.address.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
