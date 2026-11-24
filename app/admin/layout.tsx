'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { canAccess } from '@/lib/permissions';
import { LayoutDashboard, Package, Grid3X3, Tag, MapPin, ShoppingCart, Users, Settings, LogOut, Menu, X, Link2, Image, BarChart3, ScrollText, ShieldCheck, Plug, Percent } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
  { href: '/admin/produtos', label: 'Produtos', icon: Package, perm: 'produtos' },
  { href: '/admin/relacionados', label: 'Relacionados', icon: Link2, perm: 'relacionados' },
  { href: '/admin/categorias', label: 'Categorias', icon: Grid3X3, perm: 'categorias' },
  { href: '/admin/cupons', label: 'Cupons', icon: Tag, perm: 'cupons' },
  { href: '/admin/cadernos', label: 'Preços', icon: Percent, perm: 'cadernos' },
  { href: '/admin/bairros', label: 'Bairros', icon: MapPin, perm: 'bairros' },
  { href: '/admin/banners', label: 'Banners', icon: Image, perm: 'banners' },
  { href: '/admin/carrinhos', label: 'Carrinhos', icon: ShoppingCart, perm: 'carrinhos' },
  { href: '/admin/clientes', label: 'Clientes', icon: Users, perm: 'clientes' },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, perm: 'relatorios' },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText, perm: 'logs' },
  { href: '/admin/usuarios', label: 'Usuários', icon: ShieldCheck, perm: 'usuarios' },
  { href: '/admin/integracoes', label: 'Integrações', icon: Plug, perm: 'integracoes' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings, perm: 'configuracoes' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession() || {};
  const pathname = usePathname() ?? '';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const perms = (session?.user as any)?.permissions as string[] | undefined;
  const visibleNavItems = navItems.filter((item) => canAccess(perms, item.perm));

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-56 bg-white border-r border-gray-100 fixed h-full z-40">
        <div className="p-4 border-b border-gray-100">
          <Logo size="sm" />
          <p className="text-[10px] text-[#666666] mt-1">Painel Administrativo</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${isActive(item.href) ? 'bg-red-50 text-[#CD0301] font-semibold border-r-2 border-[#CD0301]' : 'text-[#666666] hover:bg-gray-50 hover:text-[#1A1A1A]'}`}>
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-[#666666] truncate mb-2">{(session?.user as any)?.name ?? ''}</p>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 text-sm text-[#CD0301] hover:underline">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-14 bottom-0 w-64 bg-white overflow-y-auto">
            <nav className="py-4">
              {visibleNavItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-2.5 px-4 py-3 text-sm ${isActive(item.href) ? 'bg-red-50 text-[#CD0301] font-semibold' : 'text-[#666666]'}`}>
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t">
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 text-sm text-[#CD0301]"><LogOut size={16} /> Sair</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
