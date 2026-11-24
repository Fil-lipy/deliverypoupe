export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { invalidateOverrides, slugify, getCategoryMeta } from '@/lib/supabase-db';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

function isBuiltinSub(catSlug: string, subSlug: string): boolean {
  const meta = getCategoryMeta(catSlug);
  return !!meta?.subcategories?.some((s: any) => s.slug === subSlug);
}

// Cria ou edita uma subcategoria (de categoria padrão ou customizada).
export async function POST(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const body = await req.json();
    const catSlug = String(body?.catSlug ?? '').trim();
    const name = String(body?.name ?? '').trim();
    if (!catSlug) return NextResponse.json({ error: 'Categoria não informada.' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'Informe um nome para a subcategoria.' }, { status: 400 });

    let slug = String(body?.slug ?? '').trim();
    const isEditing = !!slug;
    if (!slug) slug = slugify(name);
    if (!slug) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });

    const builtin = isBuiltinSub(catSlug, slug);
    if (!isEditing) {
      const existing = await prisma.customSubcategory.findUnique({ where: { catSlug_slug: { catSlug, slug } } });
      if (builtin || existing) {
        return NextResponse.json({ error: 'Já existe uma subcategoria com esse nome nesta categoria.' }, { status: 409 });
      }
    }
    const isCustom = !builtin;

    const update: any = { name };
    if (body?.order !== undefined) update.order = Number(body.order) || 0;
    if (body?.active !== undefined) update.active = body.active !== false;

    await prisma.customSubcategory.upsert({
      where: { catSlug_slug: { catSlug, slug } },
      update,
      create: {
        catSlug,
        slug,
        name,
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
      entity: 'subcategory',
      entityId: `${catSlug}::${slug}`,
      details: name,
    });
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar subcategoria.' }, { status: 500 });
  }
}

// Exclui uma subcategoria customizada (as padrão só podem ser desativadas).
export async function DELETE(req: NextRequest) {
  const { error, session } = await adminGuard();
  if (error) return error;
  try {
    const url = new URL(req.url);
    const catSlug = url.searchParams.get('catSlug') ?? '';
    const slug = url.searchParams.get('slug') ?? '';
    if (!catSlug || !slug) return NextResponse.json({ error: 'Subcategoria não informada.' }, { status: 400 });
    if (isBuiltinSub(catSlug, slug)) {
      return NextResponse.json({ error: 'Subcategorias padrão não podem ser excluídas. Você pode desativá-la.' }, { status: 400 });
    }
    await prisma.customSubcategory.deleteMany({ where: { catSlug, slug, isCustom: true } });
    // Produtos movidos para essa subcategoria mantêm a categoria, mas voltam a não ter subcategoria.
    await prisma.productOverride.updateMany({ where: { catSlug, subSlug: slug }, data: { subSlug: null, subName: null } });
    invalidateOverrides();
    await logActivity({
      userId: (session!.user as any).id,
      userName: session!.user?.name,
      action: 'delete',
      entity: 'subcategory',
      entityId: `${catSlug}::${slug}`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir subcategoria.' }, { status: 500 });
  }
}
