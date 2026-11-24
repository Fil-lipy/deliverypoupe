export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

const KEYS = [
  'integration_whatsapp_number',
  'integration_google_analytics_id',
  'integration_facebook_pixel_id',
  'integration_webhook_url',
  'integration_webhook_enabled',
];

export async function GET() {
  const { error } = await adminGuard('integracoes');
  if (error) return error;
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    return NextResponse.json({
      whatsapp_number: map['integration_whatsapp_number'] ?? '',
      google_analytics_id: map['integration_google_analytics_id'] ?? '',
      facebook_pixel_id: map['integration_facebook_pixel_id'] ?? '',
      webhook_url: map['integration_webhook_url'] ?? '',
      webhook_enabled: (map['integration_webhook_enabled'] ?? 'false') === 'true',
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error, session } = await adminGuard('integracoes');
  if (error) return error;
  try {
    const b = (await req.json()) ?? {};
    const entries: Record<string, string> = {
      integration_whatsapp_number: String(b.whatsapp_number ?? '').trim(),
      integration_google_analytics_id: String(b.google_analytics_id ?? '').trim(),
      integration_facebook_pixel_id: String(b.facebook_pixel_id ?? '').trim(),
      integration_webhook_url: String(b.webhook_url ?? '').trim(),
      integration_webhook_enabled: b.webhook_enabled ? 'true' : 'false',
    };
    const url = entries.integration_webhook_url;
    if (url && !/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'A URL do webhook deve começar com http:// ou https://' }, { status: 400 });
    await Promise.all(Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    ));
    await logActivity({ userId: (session!.user as any).id, userName: (session!.user as any).name, action: 'update', entity: 'integration', details: 'Atualizou as configurações de integrações' });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}
