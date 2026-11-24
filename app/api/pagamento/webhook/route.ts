import { interpretarWebhook } from "@/lib/asaas";
import { confirmarPagamento } from "@/lib/orders-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/pagamento/webhook — eventos do Asaas (fonte da verdade do "pago").
 * Autentica pelo header asaas-access-token (= ASAAS_WEBHOOK_TOKEN). Sempre responde 200.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const evt = interpretarWebhook(req.headers, body);
    if (evt?.pago) await confirmarPagamento(evt.pedidoId, evt.cobrancaId);
  } catch {
    /* não vaza erro ao PSP */
  }
  return Response.json({ ok: true });
}
