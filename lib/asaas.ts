/**
 * Asaas (PSP) — SERVER-SIDE apenas. Pix + cartão tokenizado + estorno parcial + webhook.
 * Env: ASAAS_API_KEY, ASAAS_BASE_URL (sandbox por padrão), ASAAS_WEBHOOK_TOKEN.
 * A chave do Asaas começa com "$" — no .env use aspas simples p/ não expandir.
 */
const BASE = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";
const KEY = process.env.ASAAS_API_KEY || "";

function headers() {
  if (!KEY) throw new Error("ASAAS_API_KEY não configurada.");
  return { access_token: KEY, "Content-Type": "application/json" } as const;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${json?.errors?.[0]?.description || res.statusText}`);
  return json as T;
}

const soDigitos = (s: string) => (s || "").replace(/\D/g, "");
const amanha = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export type StatusPagamento = "pendente" | "confirmado" | "estornado" | "parcial_estornado" | "falhou";

export function mapStatus(s: string): StatusPagamento {
  switch (s) {
    case "CONFIRMED": case "RECEIVED": case "RECEIVED_IN_CASH": return "confirmado";
    case "REFUNDED": return "estornado";
    case "REFUND_REQUESTED": case "PARTIALLY_REFUNDED": return "parcial_estornado";
    case "OVERDUE": case "CANCELED": return "falhou";
    default: return "pendente";
  }
}

export interface ClientePgto { nome: string; cpf: string; email?: string; celular?: string; }

async function ensureCustomer(c: ClientePgto): Promise<string> {
  const cpf = soDigitos(c.cpf);
  const found = await call<{ data: { id: string }[] }>(`/customers?cpfCnpj=${cpf}`);
  if (found.data?.[0]) return found.data[0].id;
  const created = await call<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: c.nome, cpfCnpj: cpf, email: c.email, mobilePhone: c.celular ? soDigitos(c.celular) : undefined }),
  });
  return created.id;
}

export async function criarCobrancaPix(input: { pedidoId: string; valor: number; descricao: string; cliente: ClientePgto }) {
  const customer = await ensureCustomer(input.cliente);
  const pay = await call<{ id: string; status: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({ customer, billingType: "PIX", value: Number(input.valor.toFixed(2)), dueDate: amanha(), externalReference: input.pedidoId, description: input.descricao }),
  });
  const qr = await call<{ encodedImage: string; payload: string; expirationDate?: string }>(`/payments/${pay.id}/pixQrCode`);
  return { id: pay.id, status: mapStatus(pay.status), pixCopiaECola: qr.payload, pixQrBase64: qr.encodedImage, expiraEm: qr.expirationDate };
}

export async function criarCobrancaCartao(input: { pedidoId: string; valor: number; descricao: string; cliente: ClientePgto; cartaoToken: string; parcelas?: number }) {
  const customer = await ensureCustomer(input.cliente);
  const pay = await call<{ id: string; status: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({ customer, billingType: "CREDIT_CARD", value: Number(input.valor.toFixed(2)), dueDate: amanha(), externalReference: input.pedidoId, description: input.descricao, creditCardToken: input.cartaoToken, installmentCount: input.parcelas && input.parcelas > 1 ? input.parcelas : undefined }),
  });
  return { id: pay.id, status: mapStatus(pay.status) };
}

/** Estorno total ou parcial (passe `valor` para cancelar um item). */
export async function estornar(cobrancaId: string, valor?: number) {
  const r = await call<{ id?: string; status?: string }>(`/payments/${cobrancaId}/refund`, {
    method: "POST",
    body: JSON.stringify(valor != null ? { value: Number(valor.toFixed(2)) } : {}),
  });
  return { id: r.id || cobrancaId, valor: valor ?? 0, concluido: r.status === "REFUNDED" };
}

/** Interpreta o webhook (valida o token do header). */
export function interpretarWebhook(h: Headers, body: unknown) {
  const token = h.get("asaas-access-token");
  if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) return null;
  const b = body as { event?: string; payment?: { id?: string; externalReference?: string } };
  if (!b?.payment?.externalReference || !b.payment.id) return null;
  return { pedidoId: b.payment.externalReference, cobrancaId: b.payment.id, pago: b.event === "PAYMENT_CONFIRMED" || b.event === "PAYMENT_RECEIVED" };
}
