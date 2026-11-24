export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { getAdminCategoryTree, invalidateOverrides, slugify, getCategoryMeta } from '@/lib/supabase-db';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

// Lista completa (categorias + subcategorias, inclusive inativas/vazias) para o painel admin.
export async function GET() {
  const { error } = await adminGuard();
  if (error) return error;
  try {
    const tree = await getAdminCategoryTree();
    return NextResponse.json(tree);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar categorias.' }, { status: 500 });
  }
}

// Cria uma nova categoria customizada ou edita uma existente (padrão do catálogo ou customizada).
export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Informe um nome para a categoria.' }, { status: 400 });

    let slug = String(body?.slug ?? '').trim();
    const isEditing = !!slug;
    if (!slug) slug = slugify(name);
    if (!slug) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });

    const builtin = !!getCategoryMeta(slug);
    if (!isEditing) {
      // Criando nova: não pode colidir com slug padrão nem com custom existente.
      const existingCustom = await prisma.customCategory.findUnique({ where: { slug } });
      if (builtin || existingCustom) {
        return NextResponse.json({ error: 'Já existe uma categoria com esse nome.' }, { status: 409 });
      }
    }
    const isCustom = !builtin;

    const update: any = { name };
    if (body?.icon !== undefined) update.icon = String(body.icon || '📦');
    if (body?.order !== undefined) update.order = Number(body.order) || 0;
    if (body?.active !== undefined) update.active = body.active !== false;

    await prisma.customCategory.upsert({
      where: { slug },
      update,
      create: {
        slug,
        name,
        icon: String(body?.icon ?? (builtin ? getCategoryMeta(slug)!.icon : '📦')),
        order: Number(body?.order) || 0,
        active: body?.active !== false,
        isCustom,
      },
    });
    invalidateOverrides();
    await logActivity({
      userId: (session!.user as any).id,
      userName: session!.user?.name,
      action: isEditing ? 'update' : 'create',
      entity: 'category',
      entityId: slug,
      details: name,
    });
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar categoria.' }, { status: 500 });
  }
}

// Exclui uma categoria customizada (as padrão só podem ser desativadas).
export async function DELETE(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const slug = new URL(req.url).searchParams.get('slug') ?? '';
    if (!slug) return NextResponse.json({ error: 'Categoria não informada.' }, { status: 400 });
    if (getCategoryMeta(slug)) {
      return NextResponse.json({ error: 'Categorias padrão não podem ser excluídas. Você pode desativá-la.' }, { status: 400 });
    }
    await prisma.customSubcategory.deleteMany({ where: { catSlug: slug } });
    await prisma.customCategory.deleteMany({ where: { slug, isCustom: true } });
    // Produtos reclassificados para essa categoria voltam à classificação original.
    await prisma.productOverride.deleteMany({ where: { catSlug: slug } });
    invalidateOverrides();
    await logActivity({
      userId: (session!.user as any).id,
      userName: session!.user?.name,
      action: 'delete',
      entity: 'category',
      entityId: slug,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir categoria.' }, { status: 500 });
  }
}
