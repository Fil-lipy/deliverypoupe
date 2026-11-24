export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCoupons } from '@/lib/supabase-db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const coupons = await getCoupons(true);

    const serialized = coupons.map(c => ({
      id: String(c.id),
      code: c.code,
      type: c.tipo === 'percentual' ? 'PERCENTAGE' : c.tipo === 'frete' ? 'FRETE' : 'FIXED',
      value: c.valor ? parseFloat(c.valor) : 0,
      maxDiscount: c.teto ? parseFloat(c.teto) : null,
      minOrder: c.minimo ? parseFloat(c.minimo) : null,
      category: c.categoria,
      beneficio: c.beneficio,
      regra: c.regra,
      expiresAt: c.validade,
      active: c.ativo,
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}
