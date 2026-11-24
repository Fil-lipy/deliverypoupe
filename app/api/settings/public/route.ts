export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDeliveryLoja } from '@/lib/supabase-db';
import { prisma } from '@/lib/prisma';

/** Número de WhatsApp que recebe os pedidos.
 *  Prioridade: número configurado pelo admin (tela de Integrações) > número da loja (ERP) > fallback. */
async function resolveWhatsappNumber(lojaWhats?: string | null): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'integration_whatsapp_number' } });
    const admin = (row?.value ?? '').replace(/[^0-9]/g, '');
    if (admin) return admin;
  } catch (e) {
    console.error('resolveWhatsappNumber error', e);
  }
  const loja = (lojaWhats ?? '').replace(/[^0-9]/g, '');
  return loja || '559491844905';
}

async function couponsEnabled(): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'coupons_enabled' } });
    return (row?.value ?? 'true') === 'true';
  } catch {
    return true;
  }
}

async function deliveryFeeEnabled(): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'delivery_fee_enabled' } });
    // Padrão: desabilitado — o frete é informado pelo atendente no WhatsApp.
    return (row?.value ?? 'false') === 'true';
  } catch {
    return false;
  }
}

async function minOrderValue(): Promise<number> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'min_order_value' } });
    const v = parseFloat(row?.value ?? '');
    return Number.isFinite(v) && v >= 0 ? v : 30;
  } catch {
    return 30;
  }
}

export async function GET() {
  try {
    const loja = await getDeliveryLoja();
    const whatsapp_number = await resolveWhatsappNumber(loja?.whatsapp);
    const coupons_enabled = await couponsEnabled();
    const delivery_fee_enabled = await deliveryFeeEnabled();
    const min_order_value = await minOrderValue();

    if (!loja) {
      return NextResponse.json({
        whatsapp_number,
        store_name: 'Poupefarma Rio Verde',
        store_address: 'Rua do Comércio, 88 — Bairro Rio Verde, Parauapebas/PA',
        store_hours: '',
        coupons_enabled,
        delivery_fee_enabled,
        min_order_value,
      });
    }

    return NextResponse.json({
      whatsapp_number,
      store_name: loja.nome,
      store_address: loja.endereco,
      store_hours: loja.horario,
      coupons_enabled,
      delivery_fee_enabled,
      min_order_value,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
