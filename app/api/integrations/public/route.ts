export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public, non-sensitive tracking IDs (GA measurement id and Meta Pixel id are
// meant to be exposed in the browser). Never returns webhook URLs or secrets.
export async function GET() {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ['integration_google_analytics_id', 'integration_facebook_pixel_id'] } } });
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    return NextResponse.json({
      googleAnalyticsId: map['integration_google_analytics_id'] ?? '',
      facebookPixelId: map['integration_facebook_pixel_id'] ?? '',
    });
  } catch (e: any) {
    return NextResponse.json({ googleAnalyticsId: '', facebookPixelId: '' });
  }
}
