export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryProducts, mapProductToAPI } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') ?? '';
    const categoryId = url.searchParams.get('categoryId') ?? '';
    const subId = url.searchParams.get('subId') ?? '';
    const detId = url.searchParams.get('detId') ?? '';
    const promo = url.searchParams.get('promo') === 'true';
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = parseInt(url.searchParams.get('limit') ?? '40', 10);
    const sort = url.searchParams.get('sort') ?? 'relevance';

    const { products, total } = await queryProducts({
      q: q || undefined,
      categoryId: categoryId || undefined,
      subId: subId || undefined,
      detId: detId || undefined,
      promo,
      sort,
      page,
      limit,
    });

    const serialized = products.map(mapProductToAPI);

    return NextResponse.json({
      products: serialized,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Products error:', error);
    const used = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '';
    const diag = {
      hasSupabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      dbTarget: used ? (used.replace(/\/\/[^@]*@/, '//***@').split('?')[0]) : '(vazio)',
    };
    return NextResponse.json({ error: 'Erro ao buscar produtos.', debug: String(error?.message ?? error), code: error?.code ?? null, diag }, { status: 500 });
  }
}
