export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recalculateCart } from '@/lib/cart-utils';
import { getCouponByCode } from '@/lib/supabase-db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Código do cupom obrigatório.' }, { status: 400 });

    // Fetch coupon from Supabase
    const coupon = await getCouponByCode(code);
    if (!coupon || !coupon.ativo) {
      return NextResponse.json({ error: 'Cupom inválido ou expirado.' }, { status: 400 });
    }

    if (coupon.validade && new Date(coupon.validade) < new Date()) {
      return NextResponse.json({ error: 'Cupom expirado.' }, { status: 400 });
    }

    const cart = await prisma.cart.findFirst({ where: { userId, status: 'CREATED' } });
    if (!cart) return NextResponse.json({ error: 'Carrinho não encontrado.' }, { status: 404 });

    const minOrder = coupon.minimo ? parseFloat(coupon.minimo) : 0;
    if (minOrder > 0 && Number(cart.subtotal) < minOrder) {
      return NextResponse.json({ error: `Pedido mínimo de R$ ${minOrder.toFixed(2).replace('.', ',')} para este cupom.` }, { status: 400 });
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: coupon.code,
        couponType: coupon.tipo,
        couponValue: coupon.valor ? parseFloat(coupon.valor) : null,
        couponMaxDiscount: coupon.teto ? parseFloat(coupon.teto) : null,
        couponMinOrder: coupon.minimo ? parseFloat(coupon.minimo) : null,
        couponBeneficio: coupon.beneficio,
      },
    });
    await recalculateCart(cart.id);

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.tipo,
        value: coupon.valor ? parseFloat(coupon.valor) : 0,
        beneficio: coupon.beneficio,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao aplicar cupom.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;

    const cart = await prisma.cart.findFirst({ where: { userId, status: 'CREATED' } });
    if (!cart) return NextResponse.json({ error: 'Carrinho não encontrado.' }, { status: 404 });

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        couponType: null,
        couponValue: null,
        couponMaxDiscount: null,
        couponMinOrder: null,
        couponBeneficio: null,
      },
    });
    await recalculateCart(cart.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao remover cupom.' }, { status: 500 });
  }
}
