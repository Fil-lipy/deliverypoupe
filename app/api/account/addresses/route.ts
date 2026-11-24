export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const addresses = await prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
    return NextResponse.json(addresses);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const body = await req.json();
    const { label, street, number, complement, neighborhood, reference, zipCode, isDefault } = body ?? {};

    if (!street || !number || !neighborhood || !zipCode) {
      return NextResponse.json({ error: 'Campos obrigatórios.' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const address = await prisma.address.create({
      data: { userId, label: label || null, street, number, complement: complement || null, neighborhood, reference: reference || null, zipCode, isDefault: isDefault ?? false },
    });
    return NextResponse.json(address, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar endereço.' }, { status: 500 });
  }
}
