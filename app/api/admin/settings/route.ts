export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { getDeliveryLoja } from '@/lib/supabase-db';

export async function GET() {
  const { error } = await adminGuard();
  if (error) return error;

  try {
    const loja = await getDeliveryLoja();
    return NextResponse.json({
      whatsapp_number: loja?.whatsapp ?? '',
      store_name: loja?.nome ?? '',
      store_address: loja?.endereco ?? '',
      store_hours: loja?.horario ?? '',
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro.' }, { status: 500 });
  }
}

export async function PUT() {
  const { error } = await adminGuard();
  if (error) return error;
  return NextResponse.json({ error: 'Configurações da loja são gerenciadas pelo ERP.' }, { status: 403 });
}
