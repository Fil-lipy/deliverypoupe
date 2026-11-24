export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { error } = await adminGuard();
  if (error) return error;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [cartsToday, sentToday, allSentToday, newUsers, abandoned, last7days] = await Promise.all([
      prisma.cart.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.cart.count({ where: { status: 'SENT_WHATSAPP', whatsappSentAt: { gte: today, lt: tomorrow } } }),
      prisma.cart.findMany({ where: { status: 'SENT_WHATSAPP', whatsappSentAt: { gte: today, lt: tomorrow } }, select: { total: true, items: { select: { quantity: true } } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: today, lt: tomorrow } } }),
      prisma.cart.count({ where: { status: 'CREATED', createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      // Last 7 days data
      (async () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const next = new Date(d);
          next.setDate(next.getDate() + 1);
          const [created, sent] = await Promise.all([
            prisma.cart.count({ where: { createdAt: { gte: d, lt: next } } }),
            prisma.cart.count({ where: { status: 'SENT_WHATSAPP', whatsappSentAt: { gte: d, lt: next } } }),
          ]);
          days.push({ date: d.toISOString().split('T')[0], created, sent });
        }
        return days;
      })(),
    ]);

    const totalValue = allSentToday.reduce((s: number, c: any) => s + Number(c.total), 0);
    const totalItems = allSentToday.reduce((s: number, c: any) => s + c.items.reduce((si: number, i: any) => si + i.quantity, 0), 0);
    const avgTicket = sentToday > 0 ? totalValue / sentToday : 0;
    const avgItems = sentToday > 0 ? totalItems / sentToday : 0;
    const convRate = cartsToday > 0 ? (sentToday / cartsToday) * 100 : 0;

    // Latest carts
    const latestCarts = await prisma.cart.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, items: { select: { quantity: true } } },
    });

    return NextResponse.json({
      cartsToday,
      sentToday,
      convRate: parseFloat(convRate.toFixed(1)),
      totalValue: parseFloat(totalValue.toFixed(2)),
      avgTicket: parseFloat(avgTicket.toFixed(2)),
      avgItems: parseFloat(avgItems.toFixed(1)),
      newUsers,
      abandoned,
      last7days,
      latestCarts: latestCarts.map((c: any) => ({
        id: c.id,
        userName: c.user?.name ?? 'N/A',
        userEmail: c.user?.email ?? '',
        createdAt: c.createdAt,
        itemCount: c.items.reduce((s: number, i: any) => s + i.quantity, 0),
        total: Number(c.total),
        status: c.status,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
