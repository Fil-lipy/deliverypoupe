export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getNeighborhoods } from '@/lib/supabase-db';

export async function GET() {
  try {
    const neighborhoods = await getNeighborhoods();

    const serialized = neighborhoods.map(n => ({
      id: String(n.id),
      name: n.nome,
      deliveryFee: parseFloat(n.taxa),
      minimumOrder: parseFloat(n.minimo),
      freeDeliveryFrom: n.frete_gratis ? parseFloat(n.frete_gratis) : null,
      active: n.ativo,
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar bairros.' }, { status: 500 });
  }
}
