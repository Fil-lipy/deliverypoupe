import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPedidoCliente, registrarCobranca } from "@/lib/orders-db";
import { criarCobrancaPix } from "@/lib/asaas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/pagamento/pix — gera a cobrança Pix (Asaas) do pedido. Body: { pedidoId } */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ erro: "Não autenticado." }, { status: 401 });
  try {
    const { pedidoId } = await req.json();
    if (!pedidoId) return Response.json({ erro: "pedidoId obrigatório." }, { status: 400 });
    const p = await getPedidoCliente(pedidoId);
    if (!p) return Response.json({ erro: "Pedido não encontrado." }, { status: 404 });
    if (p.status !== "aguardando_pagamento") return Response.json({ erro: "Pedido não está aguardando pagamento." }, { status: 409 });

    const cobranca = await criarCobrancaPix({
      pedidoId: p.id,
      valor: Number(p.total),
      descricao: `Pedido ${p.ref} — Poupefarma`,
      cliente: { nome: p.cliente_nome, cpf: p.cliente_cpf, celular: p.cliente_celular || undefined },
    });
    await registrarCobranca(p.id, "asaas", cobranca.id, "pix");
    return Response.json({ cobrancaId: cobranca.id, pixCopiaECola: cobranca.pixCopiaECola, pixQrBase64: cobranca.pixQrBase64, expiraEm: cobranca.expiraEm ?? null });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Falha ao gerar Pix." }, { status: 500 });
  }
}
