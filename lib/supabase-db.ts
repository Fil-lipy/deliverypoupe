import { Pool } from 'pg';
import ecomNames from '@/data/ecommerce-names.json';
import ecomV2 from '@/data/ecommerce-v2.json';
import productImages from '@/data/product-images.json';
import productTemplates from '@/data/product-templates.json';
import { prisma } from '@/lib/prisma';
import { getBucketConfig } from '@/lib/aws-config';

const globalForPool = globalThis as unknown as { supabasePool: Pool | undefined };

export const supabasePool =
  globalForPool.supabasePool ??
  new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
  });

supabasePool.on('error', (err: Error) => { console.error('supabasePool background error', err.message); });

if (process.env.NODE_ENV !== 'production') globalForPool.supabasePool = supabasePool;

/**
 * Executa query no Supabase com retry automático (1 retry após 1.5s).
 * Evita que um timeout isolado derrube a resposta inteira.
 */
export async function supabaseQuery(text: string, params?: any[]) {
  try {
    return await supabasePool.query(text, params);
  } catch (err: any) {
    const retriable = /timeout|ECONNRE|ECHECKOUTTIMEOUT|terminated/i.test(err.message ?? '');
    if (!retriable) throw err;
    console.warn('supabaseQuery retry after error:', err.message);
    await new Promise(r => setTimeout(r, 1500));
    return supabasePool.query(text, params);
  }
}

// ----- LOJA 04 (Poupefarma Rio Verde) -----
// Unidade de negócio (ERP) usada para estoque/preço do catálogo do delivery.
export const LOJA_ATIVA_UNIDADE_ID = 91474;

// ----- Catálogo ecommerce (categorias / nomes / descrições do arquivo BC - Poupe Farma) -----
// As classificações internas do Supabase (campo `classe`) NÃO são as categorias de ecommerce.
// O ecommerce segue a taxonomia (Categoria > Subcategoria > Detalhe), nomes e descrições da planilha.
type EcomName = {
  title: string;
  brand: string | null;
  volume: string | null;
  principio: string | null;
  catSlug: string;
  catName: string;
  subSlug: string | null;
  subName: string | null;
  detSlug: string | null;
  detName: string | null;
};
type EcomDetNode = { slug: string; name: string };
type EcomTaxNode = {
  slug: string;
  name: string;
  icon: string;
  subcategories: { slug: string; name: string; detalhes: EcomDetNode[] }[];
};
const NAMES = ecomNames as unknown as Record<string, EcomName>;
// Nova taxonomia (planilha de categorização do e-commerce), indexada por produtoid do ERP.
const TAXONOMY = (ecomV2 as any).taxonomy as EcomTaxNode[];
// produtoid -> [catSlug, subSlug|null, detSlug|null]
const CLASS_BY_PID = (ecomV2 as any).classByPid as Record<string, [string, string | null, string | null]>;
// produtoids que ficam FORA do e-commerce (serviços, itens de consultório, descontinuados).
const FORA_PIDS: number[] = ((ecomV2 as any).foraPids as any[]).map((x) => Number(x)).filter((n) => Number.isFinite(n));
const CAT_META: Record<string, EcomTaxNode> = Object.fromEntries(TAXONOMY.map((t) => [t.slug, t]));

// Lookups de nomes por slug (derivados da taxonomia).
const CAT_NAME_BY_SLUG: Record<string, string> = {};
const SUB_NAME_BY_KEY: Record<string, string> = {}; // "cat::sub" -> nome
const DET_NAME_BY_KEY: Record<string, string> = {}; // "cat::sub::det" -> nome
for (const t of TAXONOMY) {
  CAT_NAME_BY_SLUG[t.slug] = t.name;
  for (const s of t.subcategories ?? []) {
    SUB_NAME_BY_KEY[`${t.slug}::${s.slug}`] = s.name;
    for (const d of s.detalhes ?? []) DET_NAME_BY_KEY[`${t.slug}::${s.slug}::${d.slug}`] = d.name;
  }
}

// Índices produtoid por nó da árvore (para filtros de listagem).
const CATEGORY_PIDS: Record<string, number[]> = {};
const SUBCATEGORY_PIDS: Record<string, number[]> = {};
const DETAIL_PIDS: Record<string, number[]> = {};
const ALL_CLASSIFIED_PIDS: number[] = [];
for (const [pidStr, node] of Object.entries(CLASS_BY_PID)) {
  const pid = Number(pidStr);
  if (!Number.isFinite(pid)) continue;
  ALL_CLASSIFIED_PIDS.push(pid);
  const [c, s, d] = node;
  if (c) (CATEGORY_PIDS[c] ||= []).push(pid);
  if (c && s) (SUBCATEGORY_PIDS[`${c}::${s}`] ||= []).push(pid);
  if (c && s && d) (DETAIL_PIDS[`${c}::${s}::${d}`] ||= []).push(pid);
}
// Imagens reais de produtos (por EAN), buscadas na web e re-hospedadas.
const PRODUCT_IMAGES = productImages as unknown as Record<string, string>;
// Templates ilustrativos (Poupe Farma) por tipo de produto.
const PRODUCT_TEMPLATES = productTemplates as unknown as Record<string, string>;

// ----- Overrides & taxonomia customizada (editáveis no painel admin, persistidos no banco do app) -----
type Override = { catSlug: string; catName: string; subSlug: string | null; subName: string | null };
type CatOv = { name: string; icon: string; order: number; active: boolean; isCustom: boolean };
type SubOv = { slug: string; name: string; order: number; active: boolean; isCustom: boolean };
const OVERRIDE_TTL = 15 * 1000;
let _ovCache: {
  at: number;
  byEan: Map<string, Override>;
  allEans: string[];
  catOv: Map<string, CatOv>;
  subByCat: Map<string, SubOv[]>;
  dbImages: Map<string, string>;
  cadernoAllowed: Map<string, boolean>;
} | null = null;
let _ovPromise: Promise<void> | null = null;
let _catCountCache: { at: number; data: Record<string, number> } | null = null;

/** Carrega (com cache curto) os overrides de classificação e a taxonomia customizada do banco do app. */
export async function primeOverrides(force = false): Promise<void> {
  if (!force && _ovCache && Date.now() - _ovCache.at < OVERRIDE_TTL) return;
  if (_ovPromise) return _ovPromise;
  _ovPromise = (async () => {
    try {
      const [ovs, cats, subs, dbImgs, cadernos] = await Promise.all([
        prisma.productOverride.findMany(),
        prisma.customCategory.findMany(),
        prisma.customSubcategory.findMany(),
        prisma.productImage.findMany({ select: { ean: true, cloudStoragePath: true } }),
        prisma.allowedCaderno.findMany({ select: { cadernoId: true, allowed: true } }),
      ]);
      const cadernoAllowed = new Map<string, boolean>();
      for (const c of cadernos) cadernoAllowed.set(c.cadernoId, c.allowed);
      const byEan = new Map<string, Override>();
      for (const o of ovs) byEan.set(o.ean, { catSlug: o.catSlug, catName: o.catName, subSlug: o.subSlug, subName: o.subName });
      const catOv = new Map<string, CatOv>();
      for (const c of cats) catOv.set(c.slug, { name: c.name, icon: c.icon, order: c.order, active: c.active, isCustom: c.isCustom });
      const subByCat = new Map<string, SubOv[]>();
      for (const s of subs) {
        const arr = subByCat.get(s.catSlug) ?? [];
        arr.push({ slug: s.slug, name: s.name, order: s.order, active: s.active, isCustom: s.isCustom });
        subByCat.set(s.catSlug, arr);
      }
      const dbImages = new Map<string, string>();
      const { bucketName: _bn } = getBucketConfig();
      const _region = process.env.AWS_REGION ?? 'us-west-2';
      for (const img of dbImgs) {
        const encoded = img.cloudStoragePath.split('/').map(encodeURIComponent).join('/');
        dbImages.set(img.ean, `https://${_bn}.s3.${_region}.amazonaws.com/${encoded}`);
      }
      _ovCache = { at: Date.now(), byEan, allEans: Array.from(byEan.keys()), catOv, subByCat, dbImages, cadernoAllowed };
    } catch (e) {
      console.error('primeOverrides error', e);
      if (!_ovCache) _ovCache = { at: Date.now(), byEan: new Map(), allEans: [], catOv: new Map(), subByCat: new Map(), dbImages: new Map(), cadernoAllowed: new Map() };
    } finally {
      _ovPromise = null;
    }
  })();
  return _ovPromise;
}

/** Invalida os caches após edições no admin (categorias / reclassificação). */
export function invalidateOverrides() {
  _ovCache = null;
  _catCountCache = null;
}

function getOverride(ean: string): Override | undefined {
  return ean ? _ovCache?.byEan.get(ean) : undefined;
}

/**
 * Preço final "válido para o delivery".
 * O ERP grava em `precovendafinal` o MENOR preço vigente — que muitas vezes vem de
 * cadernos de oferta de LOJA FÍSICA (ex.: "VIRA MÊS", "QUARTA DA BELEZA"), que não
 * valem para o delivery. Se o preço final veio de um caderno NÃO aprovado pelo admin,
 * usamos o preço base (`precovenda`). Cadernos sem registro são tratados como permitidos
 * (preserva o comportamento atual até o admin decidir).
 */
function effectiveFinalPrice(p: SupabaseProduct): number {
  if (p.origemprecovenda === 'caderno' && p.cadernoid != null) {
    const rec = _ovCache?.cadernoAllowed?.get(String(p.cadernoid));
    const isAllowed = rec === undefined ? true : rec;
    if (!isAllowed) return p.precovenda;
  }
  return p.precovendafinal;
}

/** IDs de cadernos explicitamente NÃO permitidos para o delivery (bigint[] para o filtro SQL). */
function disallowedCadernoIds(): number[] {
  const out: number[] = [];
  const m = _ovCache?.cadernoAllowed;
  if (!m) return out;
  for (const [id, allowed] of m.entries()) {
    if (!allowed) { const n = Number(id); if (!Number.isNaN(n)) out.push(n); }
  }
  return out;
}
function overrideEans(): string[] {
  return _ovCache?.allEans ?? [];
}
/** EANs cujo override aponta para a categoria (e opcionalmente subcategoria) alvo. */
function overrideInEans(catSlug: string, subSlug?: string | null): string[] {
  if (!_ovCache) return [];
  const out: string[] = [];
  for (const [ean, o] of _ovCache.byEan) {
    if (o.catSlug !== catSlug) continue;
    if (subSlug != null && o.subSlug !== subSlug) continue;
    out.push(ean);
  }
  return out;
}

/**
 * Seleciona a imagem do produto seguindo as regras de negócio:
 * Regra ANVISA: entre os MEDICAMENTOS, apenas os MIPs (medicamentos isentos de
 * prescrição) podem exibir foto real do produto. Os demais medicamentos usam SEMPRE
 * o template ilustrativo conforme a classe e se é genérico:
 *   - MIPs -> foto real (por EAN) se houver, senão template mip (mip-generico)
 *   - CONTROLADO -> controlado (controlado-generico)
 *   - demais (RX, uso contínuo, antibióticos etc. = "tarja vermelha") -> tarja-vermelha (tarja-vermelha-generico).
 * - Não medicamentos usam a foto real (por EAN) quando disponível; caso contrário, o template "nao-medicamento".
 */
function resolveImageUrl(p: SupabaseProduct): string | null {
  const ean = eanOf(p);
  // 1) Imagem enviada pelo admin (banco) — prioridade máxima.
  const dbImg = _ovCache?.dbImages.get(ean);
  if (dbImg) return dbImg;

  const isMedicine = (p.grupo ?? '').toUpperCase().includes('MEDICAMENTO') && !(p.grupo ?? '').toUpperCase().includes('NAO');
  const isGeneric = (p.subgrupo ?? '').trim().toUpperCase() === 'GENERICO';
  if (isMedicine) {
    const classe = (p.classe ?? '').trim().toUpperCase();
    const isMip = classe === 'MIPS' || classe === 'MIP';
    let base: string;
    if (isMip) base = 'mip';
    else if (classe === 'CONTROLADO') base = 'controlado';
    else base = 'tarja-vermelha';
    const key = isGeneric ? `${base}-generico` : base;
    // Apenas MIPs podem exibir foto real (definição ANVISA); demais medicamentos só template.
    if (isMip) {
      return PRODUCT_IMAGES[ean] ?? PRODUCT_TEMPLATES[key] ?? PRODUCT_TEMPLATES[base] ?? null;
    }
    return PRODUCT_TEMPLATES[key] ?? PRODUCT_TEMPLATES[base] ?? null;
  }
  // Não medicamento: foto real se houver, senão template genérico
  return PRODUCT_IMAGES[ean] ?? PRODUCT_TEMPLATES['nao-medicamento'] ?? null;
}
function eanOf(p: { codigobarras: string | null }) {
  return p.codigobarras ? String(p.codigobarras).trim() : '';
}

/**
 * Resolve a categoria de ecommerce de um produto.
 * Prioridade: reclassificação manual (override por EAN) > taxonomia da planilha (por produtoid) > "Outros".
 * O enriquecimento de título/marca/volume continua vindo de NAMES (por EAN).
 */
export function resolveEcommerce(p: { codigobarras: string | null; classe: string | null; produtoid?: number | null }) {
  const ean = eanOf(p);
  const entry = ean ? NAMES[ean] : undefined;
  const ov = getOverride(ean);
  if (ov) {
    return {
      entry,
      catSlug: ov.catSlug,
      catName: ov.catName,
      subSlug: ov.subSlug,
      subName: ov.subName,
      detSlug: null as string | null,
      detName: null as string | null,
    };
  }
  const node = p.produtoid != null ? CLASS_BY_PID[String(p.produtoid)] : undefined;
  if (node) {
    const [c, s, d] = node;
    return {
      entry,
      catSlug: c,
      catName: CAT_NAME_BY_SLUG[c] ?? 'Outros',
      subSlug: s,
      subName: s ? (SUB_NAME_BY_KEY[`${c}::${s}`] ?? null) : null,
      detSlug: d,
      detName: d ? (DET_NAME_BY_KEY[`${c}::${s}::${d}`] ?? null) : null,
    };
  }
  return {
    entry,
    catSlug: 'outros',
    catName: 'Outros',
    subSlug: null as string | null,
    subName: null as string | null,
    detSlug: null as string | null,
    detName: null as string | null,
  };
}

// ----- Tipos -----
export interface SupabaseProduct {
  id: number;
  produtoid: number;
  codigo_interno: string;
  produto_descricao: string;
  produto_status: string;
  codigobarras: string | null;
  apresentacao: string | null;
  precovenda: number;
  precovendafinal: number;
  fabricantenome: string | null;
  grupo: string | null;
  subgrupo: string | null;
  principioativo_nome: string | null;
  quantidade_estoque: number;
  classe: string | null;
  tipo_produto: string | null;
  origemprecovenda: string | null;
  cadernoid: number | null;
}

export interface SupabaseCoupon {
  id: string;
  code: string;
  beneficio: string;
  regra: string;
  tipo: string; // 'percentual' | 'valor' | 'frete'
  valor: string | null;
  teto: string | null;
  minimo: string | null;
  categoria: string | null;
  validade: string;
  limite_cpf: number | null;
  texto_comercial: string | null;
  ativo: boolean;
  visivel_site: boolean;
}

export interface SupabaseNeighborhood {
  id: string;
  nome: string;
  taxa: string;
  minimo: string;
  frete_gratis: string | null;
  prazo: string | null;
  atendido: boolean;
  ativo: boolean;
}

export interface SupabaseLoja {
  id: string;
  codigo_erp: string;
  nome: string;
  whatsapp: string;
  endereco: string;
  horario: string;
  estoque_unidadenegocioid: string;
  ativo_delivery: boolean;
}

// ----- Queries -----

/** Buscar produtos da loja 03 com filtros */
type ProductFilterOpts = { q?: string; categoryId?: string; subId?: string; detId?: string; promo?: boolean };

/** Constrói o WHERE (com overrides de classificação) compartilhado pelas consultas de produtos. */
function buildProductFilters(opts: ProductFilterOpts): { where: string; params: any[] } {
  const { q, categoryId, subId, detId, promo } = opts;
  const conditions: string[] = [
    `estoque_unidadenegocioid = ${LOJA_ATIVA_UNIDADE_ID}`,
    `produto_status = 'A'`,
    `quantidade_estoque > 0`,
  ];
  const params: any[] = [];
  let paramIdx = 1;

  // Exclusão global: produtos marcados como "fora do e-commerce" (serviços, consultório, descontinuados)
  // nunca aparecem no catálogo, em nenhuma listagem/busca.
  if (FORA_PIDS.length) {
    conditions.push(`(produtoid IS NULL OR produtoid <> ALL($${paramIdx}::bigint[]))`);
    params.push(FORA_PIDS);
    paramIdx += 1;
  }

  if (q) {
    conditions.push(`(produto_descricao ILIKE $${paramIdx} OR fabricantenome ILIKE $${paramIdx} OR principioativo_nome ILIKE $${paramIdx} OR codigobarras = $${paramIdx + 1})`);
    params.push(`%${q}%`, q);
    paramIdx += 2;
  }
  if (categoryId) {
    const ovAll = overrideEans();
    if (subId && detId) {
      // Detalhe: produtos classificados neste detalhe, exceto os reclassificados manualmente para outro lugar.
      const pids = DETAIL_PIDS[`${categoryId}::${subId}::${detId}`] ?? [];
      conditions.push(`(produtoid = ANY($${paramIdx}::bigint[]) AND (codigobarras IS NULL OR codigobarras <> ALL($${paramIdx + 1}::text[])))`);
      params.push(pids, ovAll);
      paramIdx += 2;
    } else if (subId) {
      // Subcategoria: produtos classificados (menos reclassificados) + produtos movidos manualmente para esta sub.
      const pids = SUBCATEGORY_PIDS[`${categoryId}::${subId}`] ?? [];
      const ovIn = overrideInEans(categoryId, subId);
      conditions.push(`((produtoid = ANY($${paramIdx}::bigint[]) AND (codigobarras IS NULL OR codigobarras <> ALL($${paramIdx + 1}::text[]))) OR codigobarras = ANY($${paramIdx + 2}::text[]))`);
      params.push(pids, ovAll, ovIn);
      paramIdx += 3;
    } else if (categoryId === 'outros') {
      // "Outros": em estoque, sem classificação na taxonomia (e não reclassificado manualmente para outra categoria).
      const ovIn = overrideInEans('outros', null);
      conditions.push(`(((produtoid IS NULL OR produtoid <> ALL($${paramIdx}::bigint[])) AND (codigobarras IS NULL OR codigobarras <> ALL($${paramIdx + 1}::text[]))) OR codigobarras = ANY($${paramIdx + 2}::text[]))`);
      params.push(ALL_CLASSIFIED_PIDS, ovAll, ovIn);
      paramIdx += 3;
    } else {
      // Categoria: produtos classificados nela (menos reclassificados) + produtos movidos manualmente para ela.
      const pids = CATEGORY_PIDS[categoryId] ?? [];
      const ovIn = overrideInEans(categoryId, null);
      conditions.push(`((produtoid = ANY($${paramIdx}::bigint[]) AND (codigobarras IS NULL OR codigobarras <> ALL($${paramIdx + 1}::text[]))) OR codigobarras = ANY($${paramIdx + 2}::text[]))`);
      params.push(pids, ovAll, ovIn);
      paramIdx += 3;
    }
  }
  if (promo) {
    // Só considera promoção quando o preço final é menor que o base E não vem de um caderno bloqueado.
    const disallowed = disallowedCadernoIds();
    if (disallowed.length) {
      conditions.push(`(precovendafinal < precovenda AND (origemprecovenda <> 'caderno' OR cadernoid IS NULL OR cadernoid <> ALL($${paramIdx}::bigint[])))`);
      params.push(disallowed);
      paramIdx += 1;
    } else {
      conditions.push(`precovendafinal < precovenda`);
    }
  }

  return { where: conditions.join(' AND '), params };
}

export async function queryProducts(opts: {
  q?: string;
  categoryId?: string;
  subId?: string;
  detId?: string;
  promo?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const { sort = 'relevance', page = 1, limit = 40 } = opts;
  await primeOverrides();
  const { where, params } = buildProductFilters(opts);

  // Padrão: relevância = maior demanda (dados do ERP em cached_products).
  let orderBy = 'demanda DESC NULLS LAST, produto_descricao ASC';
  if (sort === 'price_asc') orderBy = 'precovendafinal ASC';
  else if (sort === 'price_desc') orderBy = 'precovendafinal DESC';
  else if (sort === 'discount') orderBy = '(precovenda - precovendafinal) DESC';
  else if (sort === 'name' || sort === 'produto_descricao') orderBy = 'produto_descricao ASC';

  const offset = (page - 1) * limit;

  const [dataRes, countRes] = await Promise.all([
    supabaseQuery(
      `SELECT id, produtoid, codigo_interno, produto_descricao, codigobarras, apresentacao, precovenda, precovendafinal, fabricantenome, grupo, subgrupo, principioativo_nome, quantidade_estoque, classe, tipo_produto, origemprecovenda, cadernoid FROM cached_products WHERE ${where} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    supabaseQuery(
      `SELECT COUNT(*)::int as total FROM cached_products WHERE ${where}`,
      params
    ),
  ]);

  return {
    products: dataRes.rows as SupabaseProduct[],
    total: countRes.rows[0]?.total ?? 0,
  };
}

/** Retorna TODOS os EANs (códigos de barras) que casam com o filtro — usado para "selecionar todos" na reclassificação em massa. */
export async function queryMatchingEans(opts: ProductFilterOpts): Promise<string[]> {
  await primeOverrides();
  const { where, params } = buildProductFilters(opts);
  const res = await supabaseQuery(
    `SELECT codigobarras FROM cached_products WHERE ${where} AND codigobarras IS NOT NULL AND codigobarras <> '' ORDER BY demanda DESC NULLS LAST`,
    params
  );
  return res.rows.map((r: any) => r.codigobarras as string);
}

/** Buscar produto por ID */
export async function getProductById(id: number) {
  await primeOverrides();
  const res = await supabaseQuery(
    `SELECT id, produtoid, codigo_interno, produto_descricao, codigobarras, apresentacao, precovenda, precovendafinal, fabricantenome, grupo, subgrupo, principioativo_nome, quantidade_estoque, classe, tipo_produto, origemprecovenda, cadernoid FROM cached_products WHERE id = $1 AND estoque_unidadenegocioid = ${LOJA_ATIVA_UNIDADE_ID}`,
    [id]
  );
  return (res.rows[0] as SupabaseProduct) ?? null;
}

/** Buscar vários produtos por IDs */
export async function getProductsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  await primeOverrides();
  const res = await supabaseQuery(
    `SELECT id, produtoid, codigo_interno, produto_descricao, codigobarras, apresentacao, precovenda, precovendafinal, fabricantenome, grupo, subgrupo, principioativo_nome, quantidade_estoque, classe, tipo_produto, origemprecovenda, cadernoid FROM cached_products WHERE id = ANY($1) AND estoque_unidadenegocioid = ${LOJA_ATIVA_UNIDADE_ID}`,
    [ids]
  );
  return res.rows as SupabaseProduct[];
}

/** Contagem de produtos por categoria de ecommerce (cacheada em memória) */
async function getCategoryCounts(): Promise<Record<string, number>> {
  if (_catCountCache && Date.now() - _catCountCache.at < 60 * 1000) return _catCountCache.data;
  await primeOverrides();
  const res = await supabaseQuery(
    `SELECT codigobarras, classe, produtoid FROM cached_products WHERE estoque_unidadenegocioid = ${LOJA_ATIVA_UNIDADE_ID} AND produto_status = 'A' AND quantidade_estoque > 0`
  );
  const foraSet = new Set(FORA_PIDS);
  const counts: Record<string, number> = {};
  for (const r of res.rows as { codigobarras: string | null; classe: string | null; produtoid: number | null }[]) {
    // Produtos fora do e-commerce não entram na contagem de nenhuma categoria.
    if (r.produtoid != null && foraSet.has(Number(r.produtoid))) continue;
    const { catSlug, subSlug, detSlug } = resolveEcommerce(r);
    // Contagem por categoria (chave = slug simples — mantém compatibilidade com callers existentes).
    counts[catSlug] = (counts[catSlug] ?? 0) + 1;
    // Contagem por subcategoria e detalhe (chaves compostas), usada para ocultar filtros vazios.
    if (subSlug) {
      const sk = `${catSlug}::${subSlug}`;
      counts[sk] = (counts[sk] ?? 0) + 1;
      if (detSlug) {
        const dk = `${catSlug}::${subSlug}::${detSlug}`;
        counts[dk] = (counts[dk] ?? 0) + 1;
      }
    }
  }
  _catCountCache = { at: Date.now(), data: counts };
  return counts;
}

/** Mapa de contagens do catálogo (por categoria, subcategoria e detalhe). Usado para ocultar filtros vazios. */
export async function getCatalogCounts(): Promise<Record<string, number>> {
  return getCategoryCounts();
}

/** Categorias de ecommerce (taxonomia da planilha + customizadas do admin) com contagem */
export async function getCategories(includeEmpty = false) {
  await primeOverrides();
  const counts = await getCategoryCounts();
  const catOv = _ovCache?.catOv ?? new Map<string, CatOv>();
  const seen = new Set<string>();
  const result: { slug: string; name: string; icon: string; count: number; isCustom: boolean; order: number }[] = [];
  for (const t of TAXONOMY) {
    const ov = catOv.get(t.slug);
    if (ov && ov.active === false) continue;
    seen.add(t.slug);
    result.push({ slug: t.slug, name: ov?.name ?? t.name, icon: ov?.icon ?? t.icon, count: counts[t.slug] ?? 0, isCustom: false, order: ov?.order ?? 0 });
  }
  for (const [slug, ov] of catOv) {
    if (seen.has(slug)) continue;
    if (ov.isCustom && ov.active !== false) result.push({ slug, name: ov.name, icon: ov.icon, count: counts[slug] ?? 0, isCustom: true, order: ov.order });
  }
  result.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return includeEmpty ? result : result.filter((c) => c.count > 0);
}

/** Árvore completa de categorias/subcategorias */
export function getCategoryTree() {
  return TAXONOMY;
}

/** Subcategorias de uma categoria (planilha + customizadas do admin) */
export function getSubcategories(catSlug: string): { slug: string; name: string; detalhes: EcomDetNode[] }[] {
  const staticSubs = CAT_META[catSlug]?.subcategories ?? [];
  const customs = _ovCache?.subByCat.get(catSlug) ?? [];
  const ovBySlug = new Map(customs.map((c) => [c.slug, c]));
  const out: { slug: string; name: string; detalhes: EcomDetNode[] }[] = [];
  for (const s of staticSubs) {
    const ov = ovBySlug.get(s.slug);
    if (ov && ov.active === false) continue;
    out.push({ slug: s.slug, name: ov?.name ?? s.name, detalhes: Array.isArray(s.detalhes) ? s.detalhes : [] });
  }
  for (const c of customs) {
    if (staticSubs.some((s) => s.slug === c.slug)) continue;
    if (c.isCustom && c.active !== false) out.push({ slug: c.slug, name: c.name, detalhes: [] });
  }
  return out;
}

export function getCategoryMeta(catSlug: string) {
  return CAT_META[catSlug] ?? null;
}

/** Gera um slug a partir de um nome (para categorias/subcategorias customizadas). */
export function slugify(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function buildAdminSubs(
  staticSubs: { slug: string; name: string }[],
  customs: SubOv[]
) {
  const ovBySlug = new Map(customs.map((c) => [c.slug, c]));
  const out: { slug: string; name: string; active: boolean; isCustom: boolean; order: number }[] = [];
  const seen = new Set<string>();
  for (const s of staticSubs) {
    const ov = ovBySlug.get(s.slug);
    seen.add(s.slug);
    out.push({ slug: s.slug, name: ov?.name ?? s.name, active: ov?.active ?? true, isCustom: false, order: ov?.order ?? 0 });
  }
  for (const c of customs) {
    if (seen.has(c.slug)) continue;
    if (!c.isCustom) continue;
    out.push({ slug: c.slug, name: c.name, active: c.active, isCustom: true, order: c.order });
  }
  out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return out;
}

/** Árvore completa para o painel admin: TODAS as categorias/subcategorias (inclusive inativas e vazias). */
export async function getAdminCategoryTree() {
  await primeOverrides();
  const counts = await getCategoryCounts();
  const catOv = _ovCache?.catOv ?? new Map<string, CatOv>();
  const subByCat = _ovCache?.subByCat ?? new Map<string, SubOv[]>();
  const cats: any[] = [];
  const seen = new Set<string>();
  for (const t of TAXONOMY) {
    const ov = catOv.get(t.slug);
    seen.add(t.slug);
    cats.push({
      slug: t.slug,
      name: ov?.name ?? t.name,
      icon: ov?.icon ?? t.icon,
      order: ov?.order ?? 0,
      active: ov?.active ?? true,
      isCustom: false,
      count: counts[t.slug] ?? 0,
      subcategories: buildAdminSubs(t.subcategories ?? [], subByCat.get(t.slug) ?? []),
    });
  }
  for (const [slug, ov] of catOv) {
    if (seen.has(slug) || !ov.isCustom) continue;
    cats.push({
      slug,
      name: ov.name,
      icon: ov.icon,
      order: ov.order,
      active: ov.active,
      isCustom: true,
      count: counts[slug] ?? 0,
      subcategories: buildAdminSubs([], subByCat.get(slug) ?? []),
    });
  }
  cats.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return cats;
}

/** Cupons do Supabase */
export async function getCoupons(onlyVisible = true) {
  const visibleCond = onlyVisible ? ' AND visivel_site = true' : '';
  const res = await supabaseQuery(
    `SELECT * FROM delivery_cupons WHERE ativo = true${visibleCond} ORDER BY code`
  );
  return res.rows as SupabaseCoupon[];
}

/** Buscar cupom por código */
export async function getCouponByCode(code: string) {
  const res = await supabaseQuery(
    `SELECT * FROM delivery_cupons WHERE code = $1 AND ativo = true`,
    [code.toUpperCase()]
  );
  return (res.rows[0] as SupabaseCoupon) ?? null;
}

/** Bairros */
/** Converte um registro Prisma Neighborhood para o formato SupabaseNeighborhood usado no app. */
function mapNeighborhood(n: any): SupabaseNeighborhood {
  return {
    id: String(n.id),
    nome: n.nome,
    taxa: n.taxa != null ? String(n.taxa) : '0',
    minimo: n.minimo != null ? String(n.minimo) : '0',
    frete_gratis: n.freteGratis != null ? String(n.freteGratis) : null,
    prazo: n.prazo ?? null,
    atendido: n.atendido,
    ativo: n.ativo,
  };
}

/** Bairros atendidos (gerenciados no painel admin do app). */
export async function getNeighborhoods() {
  const rows = await prisma.neighborhood.findMany({
    where: { ativo: true },
    orderBy: [{ order: 'asc' }, { nome: 'asc' }],
  });
  return rows.map(mapNeighborhood);
}

/** Buscar bairro por ID */
export async function getNeighborhoodById(id: string | number) {
  const row = await prisma.neighborhood.findFirst({ where: { id: String(id), ativo: true } });
  return row ? mapNeighborhood(row) : null;
}

/** Buscar bairro por nome (case-insensitive), considerando variações de escrita. */
export async function getNeighborhoodByName(name: string) {
  const target = (name ?? '').trim().toLowerCase();
  if (!target) return null;
  const rows = await prisma.neighborhood.findMany({ where: { ativo: true } });
  const match = rows.find(
    (r) => r.nome.trim().toLowerCase() === target || (r.variacoes ?? []).some((v: string) => v.trim().toLowerCase() === target)
  );
  return match ? mapNeighborhood(match) : null;
}

/** Loja ativa para delivery */
export async function getDeliveryLoja() {
  const res = await supabaseQuery(
    `SELECT * FROM delivery_lojas WHERE ativo_delivery = true LIMIT 1`
  );
  return (res.rows[0] as SupabaseLoja) ?? null;
}

// Helper: mapear produto Supabase para formato da API do app (nome/categoria do ecommerce)
export function mapProductToAPI(p: SupabaseProduct) {
  const effectiveFinal = effectiveFinalPrice(p);
  const hasPromo = effectiveFinal < p.precovenda;
  const { entry, catSlug, catName, subSlug, subName, detSlug, detName } = resolveEcommerce(p);
  const meta = CAT_META[catSlug];

  const name = entry?.title || p.produto_descricao;
  const brand = entry?.brand || p.fabricantenome || '';
  const presentation = entry?.volume || p.apresentacao || '';
  const activeIngredient = entry?.principio || p.principioativo_nome || '';

  const prescriptionClasses = ['RX', 'CONTROLADO', 'ANTICONCEPCIONAL'];
  const requiresPrescription = prescriptionClasses.includes(p.classe ?? '');

  return {
    id: String(p.id),
    name,
    brand,
    presentation,
    description: activeIngredient,
    activeIngredient,
    price: p.precovenda,
    promoPrice: hasPromo ? effectiveFinal : null,
    stock: p.quantidade_estoque,
    visible: true,
    requiresPrescription,
    imageUrl: resolveImageUrl(p),
    barcode: p.codigobarras,
    category: {
      id: catSlug,
      name: catName,
      slug: catSlug,
      icon: meta?.icon ?? '📦',
    },
    categoryId: catSlug,
    subcategory: subName ? { slug: subSlug, name: subName } : null,
    detail: detName ? { slug: detSlug, name: detName } : null,
  };
}

// Descrições ricas (HTML) do arquivo BC — carregadas sob demanda (arquivo grande)
let _descCache: Record<string, string> | null = null;
async function loadDescriptions(): Promise<Record<string, string>> {
  if (!_descCache) {
    const mod = await import('@/data/ecommerce-descriptions.json');
    _descCache = ((mod as any).default ?? mod) as Record<string, string>;
  }
  return _descCache;
}

/** Mapeia produto para detalhe, incluindo a descrição rica (HTML) da planilha. */
export async function mapProductDetail(p: SupabaseProduct) {
  const base = mapProductToAPI(p);
  const ean = eanOf(p);
  let descriptionHtml = '';
  if (ean) {
    const descs = await loadDescriptions();
    descriptionHtml = descs[ean] || '';
  }
  return { ...base, descriptionHtml };
}
