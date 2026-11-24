export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCategories, getSubcategories, getCatalogCounts } from '@/lib/supabase-db';

export async function GET() {
  try {
    const [cats, counts] = await Promise.all([getCategories(), getCatalogCounts()]);
    const categories = cats.map((c) => {
      // Mantém apenas subcategorias com ao menos 1 produto; e, dentro delas, apenas os detalhes com produto.
      const subcategories = getSubcategories(c.slug)
        .map((s) => ({
          slug: s.slug,
          name: s.name,
          detalhes: (Array.isArray(s.detalhes) ? s.detalhes : [])
            .filter((d) => (counts[`${c.slug}::${s.slug}::${d.slug}`] ?? 0) > 0)
            .map((d) => ({ slug: d.slug, name: d.name })),
        }))
        .filter((s) => (counts[`${c.slug}::${s.slug}`] ?? 0) > 0);
      return {
        id: c.slug,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        active: true,
        subcategories,
        _count: { products: c.count },
      };
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar categorias.' }, { status: 500 });
  }
}
