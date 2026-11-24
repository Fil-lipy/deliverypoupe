export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { generatePresignedUploadUrl, getFileUrl, deleteFile } from '@/lib/s3';
import { logActivity } from '@/lib/activity-log';
import { invalidateOverrides } from '@/lib/supabase-db';

// GET: retorna URL pressinada para upload
export async function GET(req: NextRequest) {
  const { error } = await adminGuard();
  if (error) return error;
  const url = new URL(req.url);
  const fileName = url.searchParams.get('fileName') ?? '';
  const contentType = url.searchParams.get('contentType') ?? 'image/jpeg';
  if (!fileName) return NextResponse.json({ error: 'fileName obrigatório.' }, { status: 400 });
  try {
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, true);
    return NextResponse.json({ uploadUrl, cloud_storage_path });
  } catch (e: any) {
    console.error('presign error', e);
    return NextResponse.json({ error: 'Erro ao gerar URL de upload.' }, { status: 500 });
  }
}

// POST: confirma upload e salva no banco
export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const body = await req.json();
    const ean = String(body?.ean ?? '').trim();
    const cloud_storage_path = String(body?.cloud_storage_path ?? '').trim();
    if (!ean || !cloud_storage_path) return NextResponse.json({ error: 'ean e cloud_storage_path obrigatórios.' }, { status: 400 });

    // Remove imagem anterior do S3 se existir
    const existing = await prisma.productImage.findUnique({ where: { ean } });
    if (existing) {
      try { await deleteFile(existing.cloudStoragePath); } catch { /* ok */ }
    }

    const publicUrl = await getFileUrl(cloud_storage_path, body?.contentType ?? 'image/jpeg', true);

    await prisma.productImage.upsert({
      where: { ean },
      update: { cloudStoragePath: cloud_storage_path, isPublic: true },
      create: { ean, cloudStoragePath: cloud_storage_path, isPublic: true },
    });

    await logActivity({
      userId: (session!.user as any).id,
      userName: session!.user?.name,
      action: 'update',
      entity: 'product_image',
      entityId: ean,
      details: 'Imagem atualizada',
    });

    invalidateOverrides();
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    console.error('save image error', e);
    return NextResponse.json({ error: 'Erro ao salvar imagem.' }, { status: 500 });
  }
}

// DELETE: remove imagem do produto
export async function DELETE(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const url = new URL(req.url);
    const ean = url.searchParams.get('ean') ?? '';
    if (!ean) return NextResponse.json({ error: 'ean obrigatório.' }, { status: 400 });
    const existing = await prisma.productImage.findUnique({ where: { ean } });
    if (existing) {
      try { await deleteFile(existing.cloudStoragePath); } catch { /* ok */ }
      await prisma.productImage.delete({ where: { ean } });
    }
    await logActivity({
      userId: (session!.user as any).id,
      userName: session!.user?.name,
      action: 'delete',
      entity: 'product_image',
      entityId: ean,
      details: 'Imagem removida',
    });
    invalidateOverrides();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('delete image error', e);
    return NextResponse.json({ error: 'Erro ao remover imagem.' }, { status: 500 });
  }
}
