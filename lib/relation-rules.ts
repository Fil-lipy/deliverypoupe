import { prisma } from '@/lib/prisma';
import { queryProducts, getProductsByIds, mapProductToAPI } from '@/lib/supabase-db';

export type MappedProduct = ReturnType<typeof mapProductToAPI>;

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function tokens(s: string): string[] {
  return norm(s).split(/\s+/).filter(Boolean);
}

function keyOf(p: MappedProduct, level: 'CATEGORY' | 'SUBCATEGORY' | 'DETAIL'): string | null {
  const cat = p.category?.slug;
  const sub = p.subcategory?.slug;
  const det = p.detail?.slug;
  if (level === 'CATEGORY') return cat ?? null;
  if (level === 'SUBCATEGORY') return cat && sub ? `${cat}::${sub}` : null;
  if (level === 'DETAIL') return cat && sub && det ? `${cat}::${sub}::${det}` : null;
  return null;
}

type Rule = {
  id: string;
  type: string;
  triggerType: string;
  triggerValue: string;
  targetType: string;
  targetValue: string;
  targetLimit: number;
  active: boolean;
  order: number;
};

function ruleMatchesProduct(rule: Rule, p: MappedProduct): boolean {
  switch (rule.triggerType) {
    case 'PRODUCT':
      return String(rule.triggerValue) === String(p.id);
    case 'CATEGORY':
      return rule.triggerValue === keyOf(p, 'CATEGORY');
    case 'SUBCATEGORY':
      return rule.triggerValue === keyOf(p, 'SUBCATEGORY');
    case 'DETAIL':
      return rule.triggerValue === keyOf(p, 'DETAIL');
    case 'KEYWORD': {
      const toks = tokens(rule.triggerValue);
      const hay = norm(p.name || '');
      return toks.length > 0 && toks.every((t) => hay.includes(t));
    }
    default:
      return false;
  }
}

async function resolveTarget(rule: Rule): Promise<MappedProduct[]> {
  const limit = rule.targetLimit && rule.targetLimit > 0 ? rule.targetLimit : 4;
  switch (rule.targetType) {
    case 'PRODUCT': {
      const id = parseInt(rule.targetValue, 10);
      if (isNaN(id)) return [];
      const rows = await getProductsByIds([id]);
      return rows.map(mapProductToAPI);
    }
    case 'CATEGORY': {
      const { products } = await queryProducts({ categoryId: rule.targetValue, sort: 'relevance', limit });
      return products.map(mapProductToAPI);
    }
    case 'SUBCATEGORY': {
      const [cat, sub] = String(rule.targetValue).split('::');
      const { products } = await queryProducts({ categoryId: cat, subId: sub, sort: 'relevance', limit });
      return products.map(mapProductToAPI);
    }
    case 'DETAIL': {
      const [cat, sub, det] = String(rule.targetValue).split('::');
      const { products } = await queryProducts({ categoryId: cat, subId: sub, detId: det, sort: 'relevance', limit });
      return products.map(mapProductToAPI);
    }
    case 'KEYWORD': {
      const { products } = await queryProducts({ q: rule.targetValue, sort: 'relevance', limit });
      return products.map(mapProductToAPI);
    }
    default:
      return [];
  }
}

/**
 * Resolve os produtos relacionados (cross-sell / up-sell) para um conjunto de produtos base,
 * aplicando as regras ativas do painel Relacionados. Exclui os produtos base e duplicados.
 */
export async function resolveRelatedForProducts(
  baseProducts: MappedProduct[],
  opts?: { excludeIds?: string[] }
): Promise<{ crossSell: MappedProduct[]; upSell: MappedProduct[] }> {
  const rules = (await prisma.relationRule.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })) as unknown as Rule[];
  if (rules.length === 0) return { crossSell: [], upSell: [] };

  const excl = new Set<string>([...(opts?.excludeIds ?? []).map(String), ...baseProducts.map((p) => String(p.id))]);
  const cross = new Map<string, MappedProduct>();
  const up = new Map<string, MappedProduct>();

  for (const rule of rules) {
    const matched = baseProducts.some((p) => ruleMatchesProduct(rule, p));
    if (!matched) continue;
    const targets = await resolveTarget(rule);
    const bucket = rule.type === 'UP_SELL' ? up : cross;
    for (const t of targets) {
      const tid = String(t?.id ?? '');
      if (!tid || excl.has(tid) || bucket.has(tid)) continue;
      bucket.set(tid, t);
    }
  }
  return { crossSell: Array.from(cross.values()), upSell: Array.from(up.values()) };
}
