/**
 * Pedidos de retirada paga — acesso ao Supabase "Hub" via pooler (pg),
 * no mesmo padrão de lib/supabase-db.ts. SERVER-SIDE apenas.
 *
 * IMPORTANTE (modelo de cliente): seu app usa NextAuth/Prisma para clientes, não o
 * Supabase Auth. Então o pedido guarda os DADOS do cliente (nome/cpf/celular) + um
 * cliente_ref (o id do usuário NextAuth). Rode o ALTER do COMO_INTEGRAR.md para soltar
 * a FK de delivery_pedidos.cliente_id e adicionar cliente_nome/cpf/celular/ref.
 */
import { Pool } from "pg";

declare global { var _ordersPool: Pool | undefined; }

function db(): Pool {
  if (!global._ordersPool) {
    global._ordersPool = new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return global._ordersPool;
}

const ref = () => {
  const d = new Date();
  return `#PF-${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
};
const codigoRetirada = () => String(Math.floor(100000 + Math.random() * 900000));

// Itens vêm do /api/cart (preço já definido no servidor quando o item foi adicionado).
export interface ItemEntrada { ean?: string | null; nome: string; preco: number; qty: number; exigeReceita?: boolean; }
export interface ClienteEntrada { ref: string; nome: string; cpf: string; celular?: string | null; }

/** Cria o pedido (aguardando_pagamento) a partir dos itens do carrinho. */
export async function criarPedido(p: { cliente: ClienteEntrada; lojaId: number; itens: ItemEntrada[]; cupom?: string | null; desconto?: number; observacoes?: string; }) {
  const pool = db();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const linhas = p.itens
      .filter((it) => it.nome && Number(it.preco) >= 0 && Number(it.qty) > 0)
      .map((it) => ({ ean: it.ean || "", nome: it.nome, preco: Number(it.preco), qty: Number(it.qty), exige: Boolean(it.exigeReceita) }));
    if (linhas.length === 0) throw new Error("Pedido sem itens válidos.");
    const subtotal = linhas.reduce((s, i) => s + i.preco * i.qty, 0);
    const desconto = p.desconto ?? 0;
    const total = Math.max(0, subtotal - desconto);

    const ped = await client.query(
      `insert into public.delivery_pedidos
         (ref, cliente_ref, cliente_nome, cliente_cpf, cliente_celular, loja_id, modalidade, status, subtotal, desconto, total, cupom, observacoes, codigo_retirada)
       values ($1,$2,$3,$4,$5,$6,'retirada','aguardando_pagamento',$7,$8,$9,$10,$11,$12)
       returning id, ref, total, codigo_retirada`,
      [ref(), p.cliente.ref, p.cliente.nome, (p.cliente.cpf || "").replace(/\D/g, ""), p.cliente.celular ?? null,
       p.lojaId, subtotal.toFixed(2), desconto.toFixed(2), total.toFixed(2), p.cupom ?? null, p.observacoes ?? null, codigoRetirada()],
    );
    const pedido = ped.rows[0];
    for (const l of linhas) {
      await client.query(
        `insert into public.delivery_pedido_itens (pedido_id, ean, produto_nome, qtd, preco_unit, preco_total, exige_receita)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [pedido.id, l.ean, l.nome, l.qty, l.preco.toFixed(2), (l.preco * l.qty).toFixed(2), l.exige],
      );
    }
    await client.query("commit");
    return pedido as { id: string; ref: string; total: number; codigo_retirada: string };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/** Dados do cliente do pedido (para Asaas). */
export async function getPedidoCliente(pedidoId: string) {
  const r = await db().query(
    "select id, ref, total, status, pagamento_id, cliente_nome, cliente_cpf, cliente_celular from public.delivery_pedidos where id=$1", [pedidoId]);
  return r.rows[0];
}

export async function registrarCobranca(pedidoId: string, provider: string, cobrancaId: string, metodo: string) {
  await db().query(
    "update public.delivery_pedidos set pagamento_provider=$2, pagamento_id=$3, pagamento_metodo=$4, updated_at=now() where id=$1",
    [pedidoId, provider, cobrancaId, metodo]);
}

/** Webhook confirma pagamento. Idempotente. */
export async function confirmarPagamento(pedidoId: string, cobrancaId: string) {
  const pool = db();
  const r = await pool.query(
    `select p.status, exists(select 1 from public.delivery_pedido_itens i where i.pedido_id=p.id and i.exige_receita) as tem_receita
     from public.delivery_pedidos p where p.id=$1`, [pedidoId]);
  const row = r.rows[0];
  if (!row || row.status !== "aguardando_pagamento") return;
  const novo = row.tem_receita ? "em_analise_receita" : "em_separacao";
  await pool.query(
    "update public.delivery_pedidos set pagamento_status='confirmado', pago_em=now(), status=$2, pagamento_id=$3, updated_at=now() where id=$1",
    [pedidoId, novo, cobrancaId]);
}

export async function statusPedido(pedidoId: string) {
  const r = await db().query("select id, ref, status, pagamento_status, codigo_retirada from public.delivery_pedidos where id=$1", [pedidoId]);
  return r.rows[0];
}

export async function salvarReceita(pedidoId: string, storagePath: string) {
  await db().query("insert into public.delivery_receitas (pedido_id, storage_path) values ($1,$2)", [pedidoId, storagePath]);
}

// ---------- Painel (admin) ----------
export async function listarPedidosPainel(status?: string) {
  const r = await db().query(
    `select p.id, p.ref, p.status, p.total, p.total_estornado, p.pagamento_status, p.codigo_retirada, p.created_at,
            p.cliente_nome, p.cliente_celular,
            coalesce(json_agg(json_build_object('id',i.id,'produto_nome',i.produto_nome,'qtd',i.qtd,'preco_total',i.preco_total,'exige_receita',i.exige_receita,'status',i.status)) filter (where i.id is not null), '[]') as itens
     from public.delivery_pedidos p
     left join public.delivery_pedido_itens i on i.pedido_id=p.id
     ${status ? "where p.status=$1" : ""}
     group by p.id order by p.created_at desc limit 100`,
    status ? [status] : []);
  return r.rows;
}

export async function atualizarStatus(pedidoId: string, novoStatus: string) {
  const extra = novoStatus === "retirado" ? ", retirado_em=now()" : "";
  await db().query(`update public.delivery_pedidos set status=$2, updated_at=now()${extra} where id=$1`, [pedidoId, novoStatus]);
}

export async function getItemComPedido(itemId: string) {
  const r = await db().query(
    `select i.id, i.preco_total, i.pedido_id, p.pagamento_id, p.total_estornado
     from public.delivery_pedido_itens i join public.delivery_pedidos p on p.id=i.pedido_id where i.id=$1`, [itemId]);
  return r.rows[0];
}

export async function setItemStatus(itemId: string, status: "aprovado" | "reprovado", estornoId?: string | null) {
  await db().query("update public.delivery_pedido_itens set status=$2, estorno_id=$3 where id=$1", [itemId, status, estornoId ?? null]);
}

export async function registrarEstornoParcial(pedidoId: string, valor: number, totalAtual: number) {
  await db().query("update public.delivery_pedidos set total_estornado=$2, pagamento_status='parcial_estornado' where id=$1",
    [pedidoId, (Number(totalAtual || 0) + valor).toFixed(2)]);
}

export async function avancarSeReceitaResolvida(pedidoId: string) {
  const pool = db();
  const r = await pool.query(
    "select count(*)::int as n from public.delivery_pedido_itens where pedido_id=$1 and exige_receita and status='incluido'", [pedidoId]);
  if (r.rows[0].n === 0) {
    await pool.query("update public.delivery_pedidos set status='em_separacao' where id=$1 and status='em_analise_receita'", [pedidoId]);
  }
}
