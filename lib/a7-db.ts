/**
 * Integração fiscal Alpha7 (A7Pharma) — banco de integração compartilhado.
 * Modelo (doc "Base de Dados para Integrações Externas", v2):
 *  - NÓS gravamos in_pessoa / in_pedido / in_itempedido com io_statusintegracao='N'.
 *  - O A7 lê periodicamente, cria o ORÇAMENTO e devolve o_idorcamento/o_codigoorcamento.
 *  - O balconista finaliza o orçamento no PDV na retirada → emite a NFC-e.
 *  - A NFC-e volta em out_documentofiscalpedido (lemos e guardamos no pedido).
 *
 * As tabelas (in_ e out_) são criadas pelo PRÓPRIO A7 quando o suporte Alpha7 parametriza
 * a conexão (etapa comercial, com custo mensal). Elas vivem no MESMO Hub, no schema `a7`,
 * então reusamos a conexão do app.
 *
 * TUDO é opt-in por A7_ENABLED=true. Enquanto não estiver 'true', nada é executado —
 * o fluxo de pagamento/retirada funciona normal sem o A7.
 */
import { Pool } from "pg";

const SCHEMA = process.env.A7_SCHEMA || "a7";
export function a7Habilitado() {
  return process.env.A7_ENABLED === "true";
}

declare global {
  var _a7Pool: Pool | undefined;
}
function db(): Pool {
  if (!global._a7Pool) {
    global._a7Pool = new Pool({
      connectionString:
        process.env.A7_DATABASE_URL ||
        process.env.SUPABASE_DATABASE_URL ||
        process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global._a7Pool;
}
const q = (name: string) => `"${SCHEMA}"."${name}"`;
const soDigitos = (s: unknown) => String(s ?? "").replace(/\D/g, "");

/** Mapeia EAN → out_embalagem.o_id (o A7 identifica o produto pela embalagem). */
async function idEmbalagemPorEan(ean: string): Promise<number | null> {
  if (!ean) return null;
  const r = await db().query(
    `select o_id from ${q("out_embalagem")} where o_codigobarras = $1 limit 1`,
    [ean],
  );
  return r.rows[0]?.o_id ?? null;
}

/**
 * Envia um pedido PAGO ao A7 como ORÇAMENTO (i_statuspedido='B').
 * Só manda itens dispensáveis (sem receita, ou com receita já aprovada).
 * Idempotente: marca delivery_pedidos.a7_enviado=true e não reenvia.
 */
export async function enviarPedidoAoA7(
  pedidoId: string,
): Promise<{ ok: boolean; motivo?: string; faltandoEmbalagem?: string[] }> {
  if (!a7Habilitado()) return { ok: false, motivo: "A7 desabilitado (A7_ENABLED != true)" };
  const pool = db();

  const pr = await pool.query(
    `select id, ref, cliente_ref, cliente_nome, cliente_cpf, cliente_celular,
            total, pagamento_metodo, pagamento_status, a7_enviado
       from public.delivery_pedidos where id = $1`,
    [pedidoId],
  );
  const p = pr.rows[0];
  if (!p) return { ok: false, motivo: "pedido não encontrado" };
  if (p.a7_enviado) return { ok: true, motivo: "já enviado" };
  if (p.pagamento_status !== "confirmado")
    return { ok: false, motivo: "pedido ainda não pago" };

  const itr = await pool.query(
    `select id, ean, produto_nome, qtd, preco_unit, preco_total, exige_receita, status
       from public.delivery_pedido_itens where pedido_id = $1`,
    [pedidoId],
  );
  // Só o que pode ser dispensado: sem receita, ou receita aprovada. Reprovado fica de fora.
  const itens = itr.rows.filter((i) => !i.exige_receita || i.status === "aprovado");
  if (itens.length === 0) return { ok: false, motivo: "nenhum item liberado para o A7" };

  // Resolve a embalagem (EAN → o_id) de cada item antes de abrir a transação.
  const faltando: string[] = [];
  const linhas: { emb: number; nome: string; qtd: number; unit: number; total: number }[] = [];
  for (const i of itens) {
    const emb = await idEmbalagemPorEan(String(i.ean || ""));
    if (!emb) {
      faltando.push(`${i.produto_nome} (EAN ${i.ean || "?"})`);
      continue;
    }
    linhas.push({
      emb,
      nome: i.produto_nome,
      qtd: Number(i.qtd),
      unit: Number(i.preco_unit),
      total: Number(i.preco_total),
    });
  }
  if (linhas.length === 0)
    return { ok: false, motivo: "nenhum item mapeado em out_embalagem", faltandoEmbalagem: faltando };

  const cpf = soDigitos(p.cliente_cpf);
  const pessoaRef = p.cliente_ref || `pf-${pedidoId}`;
  const total = linhas.reduce((s, l) => s + l.total, 0);

  const client = await pool.connect();
  try {
    await client.query("begin");

    // 1) Pessoa (cliente) — só insere se ainda não existir.
    const jaPessoa = await client.query(
      `select 1 from ${q("in_pessoa")} where i_codigointegracao = $1 limit 1`,
      [pessoaRef],
    );
    if (jaPessoa.rowCount === 0) {
      await client.query(
        `insert into ${q("in_pessoa")}
           (i_codigointegracao, io_statusintegracao, i_tipo, i_nome, i_cpf, i_sexo, i_celular)
         values ($1,'N','F',$2,$3,'N',$4)`,
        [pessoaRef, p.cliente_nome || "Cliente", cpf || null, soDigitos(p.cliente_celular) || null],
      );
    }

    // 2) Pedido (orçamento) — retirada, já pago, A7 emite a NFC-e.
    await client.query(
      `insert into ${q("in_pedido")}
         (i_codigointegracao, i_codigopessoaintegracao, io_statusintegracao,
          i_statuspedido, i_valortotal, i_dataemissaopedido, i_formapagamento,
          i_retiradaloja, i_pagamentoadiantadoentrega, i_vendafinalizadaexternamente)
       values ($1,$2,'N','B',$3, now(), $4, true, true, false)`,
      [pedidoId, pessoaRef, total.toFixed(4), p.pagamento_metodo === "CARTAO" ? "Cartão" : "Pix"],
    );

    // 3) Itens
    let n = 0;
    for (const l of linhas) {
      n += 1;
      await client.query(
        `insert into ${q("in_itempedido")}
           (i_codigointegracao, i_codigopedidointegracao, i_idoutembalagem,
            i_valorunitariobruto, i_valorunitarioliquido, i_quantidade, i_valortotal)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [`${pedidoId}-${n}`, pedidoId, l.emb, l.unit.toFixed(4), l.unit.toFixed(4), l.qtd, l.total.toFixed(4)],
      );
    }

    await client.query(
      `update public.delivery_pedidos
          set a7_enviado = true, a7_enviado_em = now(),
              a7_erro = $2
        where id = $1`,
      [pedidoId, faltando.length ? `Itens sem embalagem no A7: ${faltando.join("; ")}` : null],
    );

    await client.query("commit");
    return { ok: true, faltandoEmbalagem: faltando.length ? faltando : undefined };
  } catch (e: any) {
    await client.query("rollback");
    await pool
      .query(`update public.delivery_pedidos set a7_erro = $2 where id = $1`, [pedidoId, String(e?.message ?? e)])
      .catch(() => {});
    return { ok: false, motivo: String(e?.message ?? e) };
  } finally {
    client.release();
  }
}

/** Nunca derruba o fluxo de pagamento: engole o erro e registra. */
export async function enviarPedidoAoA7Silencioso(pedidoId: string) {
  if (!a7Habilitado()) return;
  try {
    await enviarPedidoAoA7(pedidoId);
  } catch (e) {
    console.error("A7 envio falhou (pedido " + pedidoId + "):", e);
  }
}

/**
 * Lê as NFC-e que o A7 devolveu (out_documentofiscalpedido) e grava no pedido.
 * Chamar por cron/polling ou por um botão na retaguarda. Idempotente.
 */
export async function importarNotasFiscaisA7(): Promise<number> {
  if (!a7Habilitado()) return 0;
  const pool = db();
  const r = await pool.query(
    `select o_id, o_codigopedidointegracao, o_numero, o_chaveacesso, o_urlconsulta, o_xml, o_datahoraemissao
       from ${q("out_documentofiscalpedido")}
      where io_integracaoconcluida = false
      limit 100`,
  );
  let n = 0;
  for (const d of r.rows) {
    try {
      await pool.query(
        `update public.delivery_pedidos
            set nfce_numero = $2, nfce_chave = $3, nfce_url = $4, nfce_xml = $5,
                nfce_emitida_em = coalesce($6, now())
          where id = $1`,
        [d.o_codigopedidointegracao, d.o_numero != null ? String(d.o_numero) : null, d.o_chaveacesso, d.o_urlconsulta, d.o_xml, d.o_datahoraemissao],
      );
      await pool.query(
        `update ${q("out_documentofiscalpedido")} set io_integracaoconcluida = true where o_id = $1`,
        [d.o_id],
      );
      n += 1;
    } catch (e) {
      console.error("A7 import NFC-e falhou (doc " + d.o_id + "):", e);
    }
  }
  return n;
}

/** Lê o retorno do orçamento (o_idorcamento/o_codigoorcamento) para um pedido já enviado. */
export async function sincronizarOrcamentoA7(pedidoId: string) {
  if (!a7Habilitado()) return;
  const pool = db();
  const r = await pool.query(
    `select o_idorcamento, o_codigoorcamento, io_statusintegracao, o_descricaoerrointegracao
       from ${q("in_pedido")} where i_codigointegracao = $1 limit 1`,
    [pedidoId],
  );
  const row = r.rows[0];
  if (!row) return;
  await pool.query(
    `update public.delivery_pedidos
        set a7_orcamento_id = $2, a7_orcamento_codigo = $3,
            a7_erro = case when $4 = 'E' then $5 else a7_erro end
      where id = $1`,
    [pedidoId, row.o_idorcamento ?? null, row.o_codigoorcamento ?? null, row.io_statusintegracao ?? null, row.o_descricaoerrointegracao ?? null],
  );
}
