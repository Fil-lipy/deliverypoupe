export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('banners');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const banner = await prisma.banner.update({
      where: { id: params.id },
      data: {
        title: b.title,
        subtitle: b.subtitle ?? null,
        imageUrl: b.imageUrl ?? null,
        linkUrl: b.linkUrl ?? null,
        bgColor: b.bgColor || '#CD0301',
        textColor: b.textColor || '#FFFFFF',
        position: b.position || 'home_hero',
        order: Number.isFinite(b.order) ? b.order : 0,
        active: b.active ?? true,
      },
    });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'update', entity: 'banner', entityId: banner.id, details: `Editou banner "${banner.title}"` });
    return NextResponse.json({ banner });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar banner.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await adminGuard('banners');
  if (error) return error;
  try {
    await prisma.banner.delete({ where: { id: params.id } });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'delete', entity: 'banner', entityId: params.id, details: 'Removeu banner' });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao remover banner.' }, { status: 500 });
  }
}
