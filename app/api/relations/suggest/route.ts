export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getProductsByIds, mapProductToAPI } from '@/lib/supabase-db';
import { resolveRelatedForProducts } from '@/lib/relation-rules';

// POST { productIds: string[] } -> sugestões de cross-sell para um conjunto de produtos do carrinho,
// excluindo os itens já presentes no carrinho.
export async function POST(req: NextRequest) {
  try {
    const { productIds } = (await req.json()) ?? {};
    const baseIds: string[] = (productIds ?? []).map((x: any) => String(x));
    if (baseIds.length === 0) return NextResponse.json({ products: [] });
    const numeric = baseIds.map((i) => parseInt(i, 10)).filter((n) => !isNaN(n));
    const rows = await getProductsByIds(numeric);
    const base = rows.map(mapProductToAPI);
    const { crossSell, upSell } = await resolveRelatedForProducts(base, { excludeIds: baseIds });
    const products = [...crossSell, ...upSell].slice(0, 8);
    return NextResponse.json({ products });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ products: [] });
  }
}
