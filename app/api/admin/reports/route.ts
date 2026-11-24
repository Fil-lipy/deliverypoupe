export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error } = await adminGuard('relatorios');
  if (error) return error;

  try {
    const sp = new URL(req.url).searchParams;
    const now = new Date();
    const defFrom = new Date(now);
    defFrom.setDate(defFrom.getDate() - 29);
    defFrom.setHours(0, 0, 0, 0);
    const from = sp.get('from') ? new Date(sp.get('from') + 'T00:00:00') : defFrom;
    const to = sp.get('to') ? new Date(sp.get('to') + 'T23:59:59') : now;

    const createdWhere = { createdAt: { gte: from, lte: to } };
    const sentWhere = { status: 'SENT_WHATSAPP' as const, whatsappSentAt: { gte: from, lte: to } };

    const [cartsCreated, sentCarts] = await Promise.all([
      prisma.cart.count({ where: createdWhere }),
      prisma.cart.findMany({
        where: sentWhere,
        select: {
          id: true, total: true, subtotal: true, discount: true, deliveryFee: true,
          deliveryMode: true, whatsappSentAt: true, couponCode: true,
          user: { select: { name: true, email: true } },
          items: { select: { productId: true, productName: true, productBrand: true, quantity: true, subtotal: true } },
        },
      }),
    ]);

    const sentCount = sentCarts.length;
    const revenue = sentCarts.reduce((s, c) => s + Number(c.total), 0);
    const totalDiscount = sentCarts.reduce((s, c) => s + Number(c.discount), 0);
    const totalItems = sentCarts.reduce((s, c) => s + c.items.reduce((si, i) => si + i.quantity, 0), 0);
    const avgTicket = sentCount > 0 ? revenue / sentCount : 0;
    const avgItems = sentCount > 0 ? totalItems / sentCount : 0;
    const convRate = cartsCreated > 0 ? (sentCount / cartsCreated) * 100 : 0;
    const deliveryCount = sentCarts.filter(c => c.deliveryMode === 'DELIVERY').length;
    const pickupCount = sentCount - deliveryCount;
    const withCoupon = sentCarts.filter(c => c.couponCode).length;

    // Top products
    const prodMap: Record<string, { name: string; brand: string; qty: number; revenue: number; orders: number }> = {};
    for (const c of sentCarts) {
      const seen = new Set<string>();
      for (const it of c.items) {
        const key = it.productId || it.productName;
        if (!prodMap[key]) prodMap[key] = { name: it.productName || 'Produto', brand: it.productBrand || '', qty: 0, revenue: 0, orders: 0 };
        prodMap[key].qty += it.quantity;
        prodMap[key].revenue += Number(it.subtotal);
        if (!seen.has(key)) { prodMap[key].orders += 1; seen.add(key); }
      }
    }
    const topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 15)
      .map(p => ({ ...p, revenue: parseFloat(p.revenue.toFixed(2)) }));

    // Top customers
    const custMap: Record<string, { name: string; email: string; orders: number; revenue: number }> = {};
    for (const c of sentCarts) {
      const key = c.user?.email || 'N/A';
      if (!custMap[key]) custMap[key] = { name: c.user?.name || 'N/A', email: c.user?.email || '', orders: 0, revenue: 0 };
      custMap[key].orders += 1;
      custMap[key].revenue += Number(c.total);
    }
    const topCustomers = Object.values(custMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
      .map(c => ({ ...c, revenue: parseFloat(c.revenue.toFixed(2)) }));

    // By-day series
    const dayMap: Record<string, { sent: number; revenue: number }> = {};
    for (const c of sentCarts) {
      const d = c.whatsappSentAt ? new Date(c.whatsappSentAt).toISOString().split('T')[0] : '';
      if (!d) continue;
      if (!dayMap[d]) dayMap[d] = { sent: 0, revenue: 0 };
      dayMap[d].sent += 1;
      dayMap[d].revenue += Number(c.total);
    }
    const series: { date: string; sent: number; revenue: number }[] = [];
    const cur = new Date(from); cur.setHours(0, 0, 0, 0);
    const end = new Date(to); end.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cur <= end && guard < 400) {
      const key = cur.toISOString().split('T')[0];
      series.push({ date: key, sent: dayMap[key]?.sent ?? 0, revenue: parseFloat((dayMap[key]?.revenue ?? 0).toFixed(2)) });
      cur.setDate(cur.getDate() + 1);
      guard++;
    }

    return NextResponse.json({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      summary: {
        cartsCreated, sentCount,
        convRate: parseFloat(convRate.toFixed(1)),
        revenue: parseFloat(revenue.toFixed(2)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        avgTicket: parseFloat(avgTicket.toFixed(2)),
        avgItems: parseFloat(avgItems.toFixed(1)),
        totalItems, deliveryCount, pickupCount, withCoupon,
      },
      topProducts, topCustomers, series,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar relatório.' }, { status: 500 });
  }
}
