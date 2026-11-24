export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { getProductById, mapProductToAPI } from '@/lib/supabase-db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await adminGuard();
  if (error) return error;

  try {
    const numericId = parseInt(params.id, 10);
    if (isNaN(numericId)) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    
    const product = await getProductById(numericId);
    if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    
    return NextResponse.json(mapProductToAPI(product));
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

// PUT/DELETE not allowed — products managed via ERP
export async function PUT() {
  return NextResponse.json({ error: 'Produtos são gerenciados pelo ERP.' }, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Produtos são gerenciados pelo ERP.' }, { status: 403 });
}
