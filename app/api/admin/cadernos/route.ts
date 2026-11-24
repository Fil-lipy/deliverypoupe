export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGuard } from '@/lib/admin-guard';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { supabaseQuery, invalidateOverrides, LOJA_ATIVA_UNIDADE_ID } from '@/lib/supabase-db';

/** Regra de padrão: listas de precificação (preço base do delivery) já vêm permitidas;
 *  cadernos de promoção de loja física começam bloqueados para o delivery. */
function defaultAllowed(name: string): boolean {
  return /LISTA\s+PRECIFIC/i.test(name ?? '');
}

/**
 * Lista os cadernos de oferta que estão definindo o preço final (origemprecovenda='caderno')
 * dos produtos da loja. Faz auto-seed dos registros ainda inexistentes no banco do app.
 */
export async function GET() {
  const { error } = await adminGuard('cadernos');
  if (error) return error;
  try {
    const res = await supabaseQuery(
      `SELECT cp.cadernoid::text AS caderno_id, cco.nome AS nome, COUNT(*)::int AS total
         FROM cached_products cp
         LEFT JOIN cached_caderno_oferta cco ON cco.caderno_oferta_id = cp.cadernoid
        WHERE cp.estoque_unidadenegocioid = ${LOJA_ATIVA_UNIDADE_ID}
          AND cp.produto_status = 'A'
          AND cp.quantidade_estoque > 0
          AND cp.origemprecovenda = 'caderno'
          AND cp.cadernoid IS NOT NULL
          AND cp.precovendafinal < cp.precovenda
        GROUP BY cp.cadernoid, cco.nome
        ORDER BY COUNT(*) DESC`,
      []
    );

    const rows: { caderno_id: string; nome: string | null; total: number }[] = res.rows;
    const existing = await prisma.allowedCaderno.findMany();
    const byId = new Map(existing.map((e) => [e.cadernoId, e]));

    const merged: { cadernoId: string; name: string; allowed: boolean; productCount: number }[] = [];
    for (const r of rows) {
      const name = r.nome ?? `Caderno ${r.caderno_id}`;
      const found = byId.get(r.caderno_id);
      if (found) {
        // Atualiza nome e contagem, preserva a decisão do admin (allowed).
        if (found.name !== name || found.productCount !== r.total) {
          await prisma.allowedCaderno.update({
            where: { cadernoId: r.caderno_id },
            data: { name, productCount: r.total },
          });
        }
        merged.push({ cadernoId: r.caderno_id, name, allowed: found.allowed, productCount: r.total });
      } else {
        const allowed = defaultAllowed(name);
        await prisma.allowedCaderno.create({
          data: { cadernoId: r.caderno_id, name, allowed, productCount: r.total },
        });
        merged.push({ cadernoId: r.caderno_id, name, allowed, productCount: r.total });
      }
    }

    return NextResponse.json({ cadernos: merged });
  } catch (e: any) {
    console.error('GET /api/admin/cadernos', e);
    return NextResponse.json({ error: 'Erro ao carregar cadernos.' }, { status: 500 });
  }
}

/** Atualiza a decisão de permitir/bloquear cadernos para o delivery. */
export async function PUT(req: NextRequest) {
  const { error, session } = await adminGuard('cadernos');
  if (error) return error;
  try {
    const body = (await req.json()) ?? {};
    const updates: { cadernoId: string; allowed: boolean }[] = Array.isArray(body.updates)
      ? body.updates
      : body.cadernoId != null
      ? [{ cadernoId: String(body.cadernoId), allowed: !!body.allowed }]
      : [];

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteração enviada.' }, { status: 400 });
    }

    for (const u of updates) {
      await prisma.allowedCaderno.upsert({
        where: { cadernoId: String(u.cadernoId) },
        update: { allowed: !!u.allowed },
        create: { cadernoId: String(u.cadernoId), allowed: !!u.allowed },
      });
    }

    // Faz o catálogo recarregar as decisões de preço.
    invalidateOverrides();

    await logActivity({
      userId: (session!.user as any).id,
      userName: (session!.user as any).name,
      action: 'update',
      entity: 'cadernos',
      details: `Atualizou ${updates.length} caderno(s) de oferta para o delivery`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('PUT /api/admin/cadernos', e);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}