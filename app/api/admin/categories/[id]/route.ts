export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';

export async function PUT() {
  const { error } = await adminGuard();
  if (error) return error;
  return NextResponse.json({ error: 'Categorias são gerenciadas pelo ERP.' }, { status: 403 });
}
