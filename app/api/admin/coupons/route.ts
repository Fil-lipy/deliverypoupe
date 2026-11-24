export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { getCoupons } from '@/lib/supabase-db';

export async function GET() {
  const { error } = await adminGuard();
  if (error) return error;

  try {
    const coupons = await getCoupons(false);
    return NextResponse.json({
      coupons: coupons.map(c => ({
        id: String(c.id),
        code: c.code,
        type: c.tipo,
        value: c.valor ? parseFloat(c.valor) : 0,
        maxDiscount: c.teto ? parseFloat(c.teto) : null,
        minOrder: c.minimo ? parseFloat(c.minimo) : null,
        category: c.categoria,
        beneficio: c.beneficio,
        regra: c.regra,
        expiresAt: c.validade,
        active: c.ativo,
        visibleSite: c.visivel_site,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

// POST not allowed — coupons managed via ERP
export async function POST() {
  return NextResponse.json({ error: 'Cupons são gerenciados pelo ERP.' }, { status: 403 });
}
