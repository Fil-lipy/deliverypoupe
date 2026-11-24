import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ajuste o caminho se seu authOptions estiver em outro lugar
import { criarPedido } from "@/lib/orders-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/pedidos — cria pedido de retirada (aguardando_pagamento).
 * Body: { cliente:{ref?,nome?,cpf,celular?}, lojaId?, itens:[{ean,qty,exigeReceita?}], cupom?, desconto? }
 * cpf/nome idealmente vêm do perfil (Prisma) do cliente logado.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ erro: "Não autenticado." }, { status: 401 });
  try {
    const body = await req.json();
    if (!Array.isArray(body?.itens) || body.itens.length === 0) {
      return Response.json({ erro: "itens obrigatórios." }, { status: 400 });
    }
    const cpf = (body?.cliente?.cpf || "").replace(/\D/g, "");
    if (!cpf) return Response.json({ erro: "CPF do cliente é obrigatório para o pagamento." }, { status: 422 });

    const pedido = await criarPedido({
      cliente: {
        ref: (session.user as { id?: string }).id || body?.cliente?.ref || "",
        nome: body?.cliente?.nome || session.user.name || "Cliente",
        cpf,
        celular: body?.cliente?.celular ?? null,
      },
      lojaId: body.lojaId ?? 1,
      itens: body.itens,
      cupom: body.cupom ?? null,
      desconto: Number(body.desconto) || 0,
      observacoes: body.observacoes,
    });
    return Response.json({ pedido });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Falha ao criar pedido." }, { status: 500 });
  }
}
