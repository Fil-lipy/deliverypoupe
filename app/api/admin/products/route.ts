export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { queryProducts, queryMatchingEans, mapProductToAPI } from '@/lib/supabase-db';

export async function GET(req: NextRequest) {
  const { error } = await adminGuard();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') ?? '';
    const categoryId = url.searchParams.get('categoryId') ?? '';
    const subId = url.searchParams.get('subId') ?? '';
    const detId = url.searchParams.get('detId') ?? '';
    const promo = url.searchParams.get('promo') === 'true';
    const sort = url.searchParams.get('sort') ?? 'relevance';
    const idsOnly = url.searchParams.get('idsOnly') === 'true';

    const filter = {
      q: q || undefined,
      categoryId: categoryId || undefined,
      subId: subId || undefined,
      detId: detId || undefined,
      promo,
    };

    // Modo "selecionar todos": retorna todos os EANs que casam com o filtro.
    if (idsOnly) {
      const eans = await queryMatchingEans(filter);
      return NextResponse.json({ eans, total: eans.length });
    }

    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = 20;

    const { products, total } = await queryProducts({ ...filter, sort, page, limit });

    return NextResponse.json({
      products: products.map(mapProductToAPI),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

// POST is read-only — products are managed in the ERP
export async function POST() {
  return NextResponse.json({ error: 'Produtos são gerenciados pelo ERP. Não é possível criar diretamente.' }, { status: 403 });
}
