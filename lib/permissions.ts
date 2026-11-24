// Central definition of admin permission keys and helpers.
// An admin with an EMPTY permissions array OR containing 'all' has full access
// (keeps the original super-admin working). Otherwise access is limited to the
// listed keys.

export interface AdminSection {
  key: string;
  label: string;
}

// All manageable admin sections (used for the permissions editor).
export const ADMIN_SECTIONS: AdminSection[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pedidos', label: 'Pedidos (retaguarda)' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'relacionados', label: 'Produtos relacionados (cross-sell)' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'cupons', label: 'Cupons' },
  { key: 'cadernos', label: 'Preços e cadernos de oferta' },
  { key: 'bairros', label: 'Bairros e fretes' },
  { key: 'banners', label: 'Banners' },
  { key: 'carrinhos', label: 'Carrinhos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'logs', label: 'Logs de atividade' },
  { key: 'usuarios', label: 'Usuários e permissões' },
  { key: 'integracoes', label: 'Integrações' },
  { key: 'configuracoes', label: 'Configurações' },
];

export function hasFullAccess(permissions?: string[] | null): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.includes('all');
}

export function canAccess(permissions: string[] | null | undefined, key: string): boolean {
  if (hasFullAccess(permissions)) return true;
  return (permissions ?? []).includes(key);
}
