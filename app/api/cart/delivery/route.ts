export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recalculateCart } from '@/lib/cart-utils';
import { getNeighborhoodById } from '@/lib/supabase-db';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;

    const { deliveryMode, neighborhoodId, addressStreet, addressNumber, addressComplement, addressRef, paymentMethod } = await req.json();

    const cart = await prisma.cart.findFirst({ where: { userId, status: 'CREATED' } });
    if (!cart) return NextResponse.json({ error: 'Carrinho não encontrado.' }, { status: 404 });

    const data: any = {
      deliveryMode: deliveryMode || 'DELIVERY',
      addressStreet: addressStreet || null,
      addressNumber: addressNumber || null,
      addressComplement: addressComplement || null,
      addressRef: addressRef || null,
    };
    if (paymentMethod === 'PIX' || paymentMethod === 'CARTAO') data.paymentMethod = paymentMethod;

    if (deliveryMode === 'PICKUP') {
      data.neighborhoodId = null;
      data.neighborhoodName = null;
      data.neighborhoodFee = null;
      data.neighborhoodMin = null;
      data.neighborhoodFree = null;
    } else if (neighborhoodId) {
      // Fetch neighborhood from Supabase
      const nbh = await getNeighborhoodById(neighborhoodId);
      if (nbh) {
        data.neighborhoodId = String(nbh.id);
        data.neighborhoodName = nbh.nome;
        data.neighborhoodFee = parseFloat(nbh.taxa);
        data.neighborhoodMin = parseFloat(nbh.minimo);
        data.neighborhoodFree = nbh.frete_gratis ? parseFloat(nbh.frete_gratis) : null;
      }
    } else {
      // Entrega para endereço sem bairro cadastrado: aceita o pedido sem taxa fixa (frete a combinar).
      data.neighborhoodId = null;
      data.neighborhoodName = null;
      data.neighborhoodFee = null;
      data.neighborhoodMin = null;
      data.neighborhoodFree = null;
    }

    await prisma.cart.update({ where: { id: cart.id }, data });
    await recalculateCart(cart.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar entrega.' }, { status: 500 });
  }
}
