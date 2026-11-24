import { adminGuard } from "@/lib/admin-guard";
import {
  listarPedidosPainel, atualizarStatus, getItemComPedido, setItemStatus,
  registrarEstornoParcial, avancarSeReceitaResolvida,
} from "@/lib/orders-db";
import { estornar } from "@/lib/asaas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/pedidos?status= — lista pedidos para a retaguarda. */
export async function GET(req: Request) {
  const { error } = await adminGuard();
  if (error) return error; // 401/403 se não-admin
  const status = new URL(req.url).searchParams.get("status") || undefined;
  return Response.json({ pedidos: await listarPedidosPainel(status) });
}

/**
 * PATCH /api/admin/pedidos — ações:
 *  { acao:'status', pedidoId, novoStatus }
 *  { acao:'receita_item', itemId, aprovado }   (reprovar => estorno parcial do item)
 */
export async function PATCH(req: Request) {
  const { error } = await adminGuard();
  if (error) return error;
  const body = await req.json();

  if (body.acao === "status") {
    const ok = ["em_separacao", "pronto_retirada", "em_rota", "retirado", "cancelado"];
    if (!ok.includes(body.novoStatus)) return Response.json({ erro: "status inválido" }, { status: 400 });
    await atualizarStatus(body.pedidoId, body.novoStatus);
    return Response.json({ ok: true });
  }

  if (body.acao === "receita_item") {
    const item = await getItemComPedido(body.itemId);
    if (!item) return Response.json({ erro: "item não encontrado" }, { status: 404 });
    if (body.aprovado) {
      await setItemStatus(body.itemId, "aprovado");
    } else {
      let estornoId: string | null = null;
      if (item.pagamento_id) {
        const r = await estornar(item.pagamento_id, Number(item.preco_total));
        estornoId = r.id;
        await registrarEstornoParcial(item.pedido_id, Number(item.preco_total), Number(item.total_estornado || 0));
      }
      await setItemStatus(body.itemId, "reprovado", estornoId);
    }
    await avancarSeReceitaResolvida(item.pedido_id);
    return Response.json({ ok: true });
  }

  return Response.json({ erro: "ação desconhecida" }, { status: 400 });
}
