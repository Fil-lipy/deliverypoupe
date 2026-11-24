export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

async function dispatchWebhook(cart: any, userName: string) {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ['integration_webhook_url', 'integration_webhook_enabled'] } } });
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    const enabled = (map['integration_webhook_enabled'] ?? 'false') === 'true';
    const url = map['integration_webhook_url'] ?? '';
    if (!enabled || !url) return;
    const payload = {
      event: 'order.sent',
      cartId: cart.id,
      customer: userName,
      deliveryMode: cart.deliveryMode,
      neighborhood: cart.neighborhoodName,
      subtotal: Number(cart.subtotal),
      discount: Number(cart.discount),
      deliveryFee: Number(cart.deliveryFee),
      total: Number(cart.total),
      couponCode: cart.couponCode,
      items: (cart.items ?? []).map((i: any) => ({ productId: i.productId, name: i.productName, quantity: i.quantity, unitPrice: Number(i.unitPrice), subtotal: Number(i.subtotal) })),
      sentAt: new Date().toISOString(),
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(t);
  } catch (e) {
    console.error('Webhook dispatch failed', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const userId = (session.user as any).id;

    const { cartId, notes } = await req.json();

    const cart = await prisma.cart.findFirst({
      where: { id: cartId, userId, status: 'CREATED' },
      include: { items: true },
    });
    if (!cart) return NextResponse.json({ error: 'Carrinho não encontrado.' }, { status: 404 });
    if (cart.items.length === 0) return NextResponse.json({ error: 'Carrinho vazio.' }, { status: 400 });

    // Valor mínimo de pedido (base: produtos, sem frete)
    const minRow = await prisma.setting.findUnique({ where: { key: 'min_order_value' } });
    const parsedMin = parseFloat(minRow?.value ?? '');
    const minOrder = Number.isFinite(parsedMin) && parsedMin >= 0 ? parsedMin : 30;
    const goodsValue = Number(cart.subtotal) - Number(cart.discount);
    if (minOrder > 0 && goodsValue < minOrder) {
      const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return NextResponse.json({ error: `O pedido mínimo é de ${fmt(minOrder)}. Adicione mais itens ao carrinho para continuar.` }, { status: 400 });
    }

    await prisma.cart.update({
      where: { id: cartId },
      data: {
        notes: notes || null,
        status: 'SENT_WHATSAPP',
        whatsappSentAt: new Date(),
      },
    });

    const itemCount = cart.items.reduce((s: number, i: any) => s + i.quantity, 0);
    await logActivity({ userId, userName: (session.user as any).name, action: 'send', entity: 'cart', entityId: cartId, details: `Pedido enviado via WhatsApp • ${itemCount} item(ns) • ${Number(cart.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` });
    await dispatchWebhook(cart, (session.user as any).name ?? '');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao enviar carrinho.' }, { status: 500 });
  }
}
