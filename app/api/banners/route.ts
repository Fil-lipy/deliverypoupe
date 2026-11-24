export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { order: 'asc' }],
      select: { id: true, title: true, subtitle: true, imageUrl: true, linkUrl: true, bgColor: true, textColor: true, position: true },
    });
    return NextResponse.json({ banners });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ banners: [] });
  }
}
