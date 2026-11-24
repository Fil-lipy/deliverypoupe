export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getProductById, mapProductDetail, mapProductToAPI, queryProducts } from '@/lib/supabase-db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const numericId = parseInt(params.id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }

    const product = await getProductById(numericId);
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }

    const mapped = await mapProductDetail(product);

    // Produtos relacionados da mesma categoria de ecommerce
    const { products: related } = await queryProducts({
      categoryId: mapped.category.slug || undefined,
      limit: 8,
    });
    const relatedMapped = related
      .filter(r => r.id !== product.id)
      .slice(0, 6)
      .map(mapProductToAPI);

    return NextResponse.json({ ...mapped, relatedProducts: relatedMapped });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar produto.' }, { status: 500 });
  }
}
