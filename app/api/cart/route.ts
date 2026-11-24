export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recalculateCart } from '@/lib/cart-utils';
import { getProductById, mapProductToAPI } from '@/lib/supabase-db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // Guests can browse without a cart; return null instead of 401 to avoid console noise
    if (!session?.user) return NextResponse.json(null);
    const userId = (session.user as any).id;

    const cart = await prisma.cart.findFirst({
      where: { userId, status: 'CREATED' },
      include: {
        items: { orderBy: { productName: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!cart) return NextResponse.json(null);

    // Fetch product details from Supabase for each item
    const productIds = cart.items.map((i: any) => parseInt(i.productId, 10)).filter((n: number) => !isNaN(n));
    let productMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { getProductsByIds } = await import('@/lib/supabase-db');
      const products = await getProductsByIds(productIds);
      products.forEach(p => {
        productMap[String(p.id)] = mapProductToAPI(p);
      });
    }

    return NextResponse.json({
      ...cart,
      subtotal: Number(cart.subtotal),
      discount: Number(cart.discount),
      deliveryFee: Number(cart.deliveryFee),
      total: Number(cart.total),
      coupon: cart.couponCode ? {
        code: cart.couponCode,
        type: cart.couponType,
        value: cart.couponValue ? Number(cart.couponValue) : 0,
        maxDiscount: cart.couponMaxDiscount ? Number(cart.couponMaxDiscount) : null,
        minOrder: cart.couponMinOrder ? Number(cart.couponMinOrder) : null,
        beneficio: cart.couponBeneficio,
      } : null,
      neighborhood: cart.neighborhoodId ? {
        id: cart.neighborhoodId,
        name: cart.neighborhoodName,
        deliveryFee: cart.neighborhoodFee ? Number(cart.neighborhoodFee) : 0,
        minimumOrder: cart.neighborhoodMin ? Number(cart.neighborhoodMin) : 0,
        freeDeliveryFrom: cart.neighborhoodFree ? Number(cart.neighborhoodFree) : null,
      } : null,
      items: cart.items.map((i: any) => {
        const product = productMap[i.productId] ?? {
          id: i.productId,
          name: i.productName,
          brand: i.productBrand,
          price: Number(i.unitPrice),
          promoPrice: null,
          category: { name: '', icon: '' },
        };
        return {
          ...i,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
          product,
        };
      }),
    });
  } catch (error: any) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar carrinho.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;
    const { productId, quantity = 1 } = await req.json();

    if (!productId) return NextResponse.json({ error: 'Produto obrigatório.' }, { status: 400 });

    // Fetch product from Supabase
    const numericId = parseInt(productId, 10);
    if (isNaN(numericId)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const product = await getProductById(numericId);
    if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });

    const mapped = mapProductToAPI(product);
    const unitPrice = mapped.promoPrice ?? mapped.price;

    // Find or create active cart
    let cart = await prisma.cart.findFirst({ where: { userId, status: 'CREATED' }, include: { items: true } });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    // Check if product already in cart
    const pidStr = String(numericId);
    const existingItem = cart.items.find((i: any) => i.productId === pidStr);
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty, subtotal: parseFloat((newQty * unitPrice).toFixed(2)) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: pidStr,
          productName: mapped.name,
          productBrand: mapped.brand,
          requiresPrescription: mapped.requiresPrescription,
          quantity,
          unitPrice,
          subtotal: parseFloat((quantity * unitPrice).toFixed(2)),
        },
      });
    }

    await recalculateCart(cart.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar ao carrinho.' }, { status: 500 });
  }
}
