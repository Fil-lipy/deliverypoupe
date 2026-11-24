export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export async function GET() {
  const { error } = await adminGuard('banners');
  if (error) return error;
  try {
    const banners = await prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { order: 'asc' }] });
    return NextResponse.json({ banners });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard('banners');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    if (!b.title) return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 });
    const banner = await prisma.banner.create({
      data: {
        title: b.title,
        subtitle: b.subtitle || null,
        imageUrl: b.imageUrl || null,
        linkUrl: b.linkUrl || null,
        bgColor: b.bgColor || '#CD0301',
        textColor: b.textColor || '#FFFFFF',
        position: b.position || 'home_hero',
        order: Number.isFinite(b.order) ? b.order : 0,
        active: b.active ?? true,
      },
    });
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'create', entity: 'banner', entityId: banner.id, details: `Criou banner "${banner.title}"` });
    return NextResponse.json({ banner }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar banner.' }, { status: 500 });
  }
}
