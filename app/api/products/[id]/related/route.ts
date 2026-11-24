export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getProductById, mapProductToAPI } from '@/lib/supabase-db';
import { resolveRelatedForProducts } from '@/lib/relation-rules';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ crossSell: [], upSell: [] });
    const row = await getProductById(id);
    if (!row) return NextResponse.json({ crossSell: [], upSell: [] });
    const base = mapProductToAPI(row);
    const { crossSell, upSell } = await resolveRelatedForProducts([base], { excludeIds: [String(params.id)] });
    return NextResponse.json({ crossSell, upSell });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ crossSell: [], upSell: [] });
  }
}
