// Limitador de taxa em memória (janela fixa). Adequado para instância única do servidor.
// Protege contra força bruta de login e criação de contas em massa por bots.

type Bucket = { count: number; resetAt: number };

const globalForRL = globalThis as unknown as { __rlStore?: Map<string, Bucket> };
const store: Map<string, Bucket> = globalForRL.__rlStore ?? new Map();
globalForRL.__rlStore = store;

let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

export type RateResult = { allowed: boolean; retryAfter: number };

/**
 * Registra uma tentativa para `key` e informa se está dentro do limite.
 * @param limit   número máximo de tentativas dentro da janela
 * @param windowMs duração da janela em milissegundos
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  sweep();
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { allowed: true, retryAfter: 0 };
}

/** Extrai o IP do cliente de um NextRequest (Headers) ou do req do next-auth (objeto simples). */
export function getClientIp(req: { headers: any } | null | undefined): string {
  const h = req?.headers;
  if (!h) return 'unknown';
  const get = (name: string): string | null =>
    typeof h.get === 'function' ? h.get(name) : (h[name] ?? h[name.toLowerCase()] ?? null);
  const xff = get('x-forwarded-for');
  if (xff) return String(xff).split(',')[0].trim() || 'unknown';
  const real = get('x-real-ip');
  return real ? String(real).trim() : 'unknown';
}
