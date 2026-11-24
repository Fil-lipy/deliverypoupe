import { statusPedido } from "@/lib/orders-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/pedidos/status?id= — status para polling no checkout. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ erro: "id obrigatório." }, { status: 400 });
  const data = await statusPedido(id);
  if (!data) return Response.json({ erro: "não encontrado" }, { status: 404 });
  return Response.json(data);
}
